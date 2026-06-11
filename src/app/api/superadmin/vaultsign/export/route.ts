import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Export VaultSign activity as CSV
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
    const status = searchParams.get("status");
    const organization_id = searchParams.get("organization_id");
    const document_type = searchParams.get("document_type");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    const where: any = {};
    if (status) where.status = status;
    if (organization_id) where.organization_id = parseInt(organization_id);
    if (document_type) where.document_type = document_type;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from);
      if (date_to) where.created_at.lte = new Date(date_to);
    }

    const documents = await db.vaultSignDocument.findMany({
      where,
      include: {
        signers: { select: { name: true, email: true, role: true, status: true, signed_at: true } },
        organization: { select: { name: true } },
        creator: { select: { first_name: true, last_name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
      take: 5000,
    });

    // Build CSV
    const headers = [
      "Document ID", "Document Name", "Type", "Source", "Status",
      "Organization", "Created By", "Signers", "Signer Status",
      "Created At", "Updated At", "Expires At",
    ];

    const rows = documents.map((doc: any) => {
      const signerNames = doc.signers.map((s: any) => s.name).join("; ");
      const signerStatuses = doc.signers.map((s: any) => `${s.name}:${s.status}`).join("; ");
      return [
        doc.id,
        `"${(doc.document_name || "").replace(/"/g, '""')}"`,
        doc.document_type,
        doc.source_type,
        doc.status,
        `"${(doc.organization?.name || "").replace(/"/g, '""')}"`,
        `"${(doc.creator ? `${doc.creator.first_name} ${doc.creator.last_name}` : "").replace(/"/g, '""')}"`,
        `"${signerNames}"`,
        `"${signerStatuses}"`,
        doc.created_at.toISOString(),
        doc.updated_at.toISOString(),
        doc.expiry_date?.toISOString() || "",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=vaultsign-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch (error) {
    console.error("[VAULTSIGN] Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
