import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const orgId = searchParams.get("organization_id");
    const recruiterId = searchParams.get("recruiter_id");

    const where: any = {};
    if (status) where.status = status;
    if (orgId) where.organization_id = parseInt(orgId);
    if (recruiterId) where.created_by_user_id = parseInt(recruiterId);

    const documents = await db.vaultSignDocument.findMany({
      where,
      include: {
        signers: true,
        organization: { select: { id: true, name: true } },
        creator: { select: { id: true, first_name: true, last_name: true, email: true } },
        template: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalSent = await db.vaultSignDocument.count({ where: { status: { in: ["sent", "partially_signed", "completed", "declined", "expired", "voided"] } } });
    const completedThisMonth = await db.vaultSignDocument.count({ where: { status: "completed", updated_at: { gte: startOfMonth } } });
    const pendingSignatures = await db.vaultSignDocument.count({ where: { status: { in: ["sent", "partially_signed"] } } });
    const declinedThisMonth = await db.vaultSignDocument.count({ where: { status: "declined", updated_at: { gte: startOfMonth } } });

    return NextResponse.json({
      documents,
      stats: { total_sent: totalSent, completed_this_month: completedThisMonth, pending_signatures: pendingSignatures, declined_this_month: declinedThisMonth },
    });
  } catch (error) {
    console.error("[VAULTSIGN-ACTIVITY]", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
