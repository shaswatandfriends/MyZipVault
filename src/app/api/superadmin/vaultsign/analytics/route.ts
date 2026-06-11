import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get VaultSign analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get("organization_id");

    const where: any = {};
    if (organization_id) where.organization_id = parseInt(organization_id);

    // Core stats
    const [totalDocs, completedDocs, declinedDocs, expiredDocs] = await Promise.all([
      db.vaultSignDocument.count({ where }),
      db.vaultSignDocument.count({ where: { ...where, status: "completed" } }),
      db.vaultSignDocument.count({ where: { ...where, status: "declined" } }),
      db.vaultSignDocument.count({ where: { ...where, status: "expired" } }),
    ]);

    const completionRate = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
    const declineRate = totalDocs > 0 ? Math.round((declinedDocs / totalDocs) * 100) : 0;

    // Average signing time (completed docs)
    const completedDocsData = await db.vaultSignDocument.findMany({
      where: { ...where, status: "completed" },
      select: { created_at: true, updated_at: true },
      take: 100,
      orderBy: { updated_at: "desc" },
    });

    const avgSigningMs = completedDocsData.length > 0
      ? completedDocsData.reduce((acc, doc) => acc + (doc.updated_at.getTime() - doc.created_at.getTime()), 0) / completedDocsData.length
      : 0;
    const avgSigningHours = Math.round(avgSigningMs / (1000 * 60 * 60));

    // Documents by status
    const statusCounts = await db.vaultSignDocument.groupBy({
      by: ["status"],
      _count: { id: true },
      where,
    });

    // Documents by type
    const typeCounts = await db.vaultSignDocument.groupBy({
      by: ["document_type"],
      _count: { id: true },
      where,
    });

    // Documents over time (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentDocs = await db.vaultSignDocument.findMany({
      where: { ...where, created_at: { gte: twelveMonthsAgo } },
      select: { created_at: true, status: true },
      orderBy: { created_at: "asc" },
    });

    // Group by month
    const byMonth: Record<string, { created: number; completed: number; declined: number }> = {};
    for (const doc of recentDocs) {
      const monthKey = doc.created_at.toISOString().slice(0, 7); // YYYY-MM
      if (!byMonth[monthKey]) byMonth[monthKey] = { created: 0, completed: 0, declined: 0 };
      byMonth[monthKey].created++;
      if (doc.status === "completed") byMonth[monthKey].completed++;
      if (doc.status === "declined") byMonth[monthKey].declined++;
    }

    // Per-organization stats
    const orgStats = await db.vaultSignDocument.groupBy({
      by: ["organization_id"],
      _count: { id: true },
      where,
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Get org names
    const orgIds = orgStats.map((s) => s.organization_id).filter(Boolean) as number[];
    const orgs = await db.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

    // Signer stats
    const totalSigners = await db.vaultSignSigner.count();
    const signedSigners = await db.vaultSignSigner.count({ where: { status: "signed" } });
    const pendingSigners = await db.vaultSignSigner.count({ where: { status: "pending" } });

    return NextResponse.json({
      overview: {
        totalDocuments: totalDocs,
        completedDocuments: completedDocs,
        declinedDocuments: declinedDocs,
        expiredDocuments: expiredDocs,
        completionRate,
        declineRate,
        avgSigningHours,
      },
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id])),
      byType: Object.fromEntries(typeCounts.map((t) => [t.document_type, t._count.id])),
      byMonth: Object.entries(byMonth).map(([month, counts]) => ({ month, ...counts })),
      byOrganization: orgStats.map((s) => ({
        organization_id: s.organization_id,
        name: orgMap[s.organization_id as number] || "Unknown",
        documentCount: s._count.id,
      })),
      signers: {
        total: totalSigners,
        signed: signedSigners,
        pending: pendingSigners,
        signRate: totalSigners > 0 ? Math.round((signedSigners / totalSigners) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("[VAULTSIGN] Analytics error:", error);
    return NextResponse.json({ error: "Failed to get analytics" }, { status: 500 });
  }
}
