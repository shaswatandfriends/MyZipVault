import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/superadmin/credits/balance
 *
 * Returns all organizations with their credit balances.
 * Supports search by org name.
 *
 * Query: ?search=xxx
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
    const search = searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { ilike: `%${search}%` };
    }

    const orgs = await db.organization.findMany({
      where,
      orderBy: { credits_balance: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        credits_balance: true,
        account_status: true,
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        credits_balance: o.credits_balance,
        account_status: o.account_status,
        user_count: o._count.users,
      })),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[SUPERADMIN_CREDITS_BALANCE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/credits/balance
 *
 * Manually adjust an organization's credit balance.
 *
 * Body: {
 *   organization_id: number,
 *   amount: number,        // positive to add, negative to remove
 *   reason: string,        // required — why the adjustment was made
 * }
 *
 * Creates a CreditTransaction with type 'manual_adjustment' and
 * an audit log entry.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { organization_id, amount, reason } = body;

    if (!organization_id || !amount || !reason) {
      return NextResponse.json(
        { error: "organization_id, amount, and reason are required" },
        { status: 400 },
      );
    }

    const adjustAmount = parseInt(amount, 10);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
      return NextResponse.json({ error: "Amount must be a non-zero integer" }, { status: 400 });
    }
    if (adjustAmount < -10000 || adjustAmount > 10000) {
      return NextResponse.json({ error: "Amount must be between -10000 and 10000" }, { status: 400 });
    }
    if (String(reason).trim().length < 5) {
      return NextResponse.json({ error: "Reason must be at least 5 characters" }, { status: 400 });
    }

    // Update org balance
    const org = await db.organization.update({
      where: { id: parseInt(organization_id, 10) },
      data: { credits_balance: { increment: adjustAmount } },
      select: { id: true, name: true, credits_balance: true },
    });

    // Create credit transaction
    await db.creditTransaction.create({
      data: {
        organization_id: org.id,
        transaction_type: "manual_adjustment",
        credit_amount: adjustAmount,
        description: `Manual adjustment by superadmin: ${String(reason).trim()}`,
      },
    });

    // Audit log
    try {
      await logAudit({
        userId: adminId,
        role: "super_admin",
        action: "superadmin_credit_adjustment",
        entityType: "organization",
        entityId: org.id,
        details: `Adjusted ${org.name} credits by ${adjustAmount > 0 ? "+" : ""}${adjustAmount}. Reason: ${reason}. New balance: ${org.credits_balance}`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        credits_balance: org.credits_balance,
      },
    });
  } catch (error: any) {
    console.error("[SUPERADMIN_CREDITS_BALANCE_POST]", error);
    return NextResponse.json({ error: "Failed to adjust balance" }, { status: 500 });
  }
}
