import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/employer/credits/transactions
 *
 * Paginated list of credit transactions for the employer's organization.
 *
 * Query params:
 *   - page (default 1)
 *   - limit (default 20, max 100)
 *   - type (optional filter by transaction_type)
 *
 * Common transaction types the employer will see:
 *   - 'purchase' — credits bought via Stripe
 *   - 'referral_bonus' — credits earned via the referral program
 *   - 'reveal' — credits spent revealing candidate contact info
 *   - 'placement_payout' — credits granted when an employer pays a placement fee
 *     (recruiter-side equivalent; for employers this is the credits balance
 *     they retain after a placement payment)
 *   - 'original_owner_residual' — rare; only if the employer was an original
 *     candidate owner (unusual for employers)
 *
 * Auth: employer role only.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 10), 100);
    const type = searchParams.get("type") || undefined;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organization_id: organizationId,
    };
    if (type) where.transaction_type = type;

    const [transactions, total] = await Promise.all([
      db.creditTransaction.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      db.creditTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[EMPLOYER_CREDITS_TRANSACTIONS]", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
