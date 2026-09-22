import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/credits/transactions
 *
 * Returns all credit transactions with filters + pagination.
 *
 * Query params:
 *   page (default 1)
 *   pageSize (default 50, max 200)
 *   organization_id (filter by org)
 *   transaction_type (filter by type)
 *   search (search in description)
 *
 * Response: {
 *   transactions: [...],
 *   pagination: { page, pageSize, total, totalPages }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "50", 10), 10), 200);
    const organization_id = searchParams.get("organization_id");
    const transaction_type = searchParams.get("transaction_type");
    const search = searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (organization_id) where.organization_id = parseInt(organization_id, 10);
    if (transaction_type) where.transaction_type = transaction_type;
    if (search) {
      where.description = { ilike: `%${search}%` };
    }

    const [transactions, total] = await Promise.all([
      db.creditTransaction.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          organization: { select: { id: true, name: true } },
        },
      }),
      db.creditTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        organization_id: t.organization_id,
        organization_name: t.organization?.name ?? "—",
        transaction_type: t.transaction_type,
        credit_amount: t.credit_amount,
        description: t.description,
        created_at: t.created_at,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[SUPERADMIN_CREDITS_TRANSACTIONS]", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
