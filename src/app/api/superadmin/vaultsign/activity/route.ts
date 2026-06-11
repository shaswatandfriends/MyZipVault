import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get all VaultSign activity across organizations (paginated)
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status) where.status = status;
    if (organization_id) where.organization_id = parseInt(organization_id);
    if (document_type) where.document_type = document_type;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from);
      if (date_to) where.created_at.lte = new Date(date_to);
    }

    const [documents, total] = await Promise.all([
      db.vaultSignDocument.findMany({
        where,
        include: {
          signers: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              signer_index: true,
              status: true,
              signed_at: true,
            },
          },
          organization: {
            select: { id: true, name: true },
          },
          creator: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          template: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vaultSignDocument.count({ where }),
    ]);

    // Stats
    const stats = await db.vaultSignDocument.aggregate({
      _count: { id: true },
      _sum: {},
    });

    const statusCounts = await db.vaultSignDocument.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    return NextResponse.json({
      documents: documents.map((doc: any) => ({
        ...doc,
        sign_fields: JSON.parse(doc.sign_fields || "[]"),
        placeholder_values: JSON.parse(doc.placeholder_values || "{}"),
        audit_trail: JSON.parse(doc.audit_trail || "[]"),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: stats._count.id,
        byStatus: Object.fromEntries(statusCounts.map((s: any) => [s.status, s._count.id])),
      },
    });
  } catch (error) {
    console.error("[VAULTSIGN] Activity error:", error);
    return NextResponse.json({ error: "Failed to get activity" }, { status: 500 });
  }
}
