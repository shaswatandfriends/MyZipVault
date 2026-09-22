import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/credits/dashboard
 *
 * Returns aggregated credit system stats for the superadmin credits dashboard.
 *
 * Response: {
 *   totalCreditsInSystem: number,       // sum of all org credits_balance
 *   totalOrgs: number,
 *   totalTransactions: number,
 *   transactionsThisMonth: number,
 *   creditsGrantedThisMonth: number,
 *   creditsSpentThisMonth: number,
 *   recentTransactions: CreditTransaction[],  // last 20
 *   topOrgsByBalance: { org_id, name, credits_balance }[],
 *   rewardConfig: Record<string, number>,     // configured reward amounts
 * }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Total credits in system (sum of all org balances)
    const orgStats = await db.organization.aggregate({
      _sum: { credits_balance: true },
      _count: true,
    });

    // Transaction stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalTransactions, transactionsThisMonth, monthStats] = await Promise.all([
      db.creditTransaction.count(),
      db.creditTransaction.count({
        where: { created_at: { gte: startOfMonth } },
      }),
      db.creditTransaction.groupBy({
        by: ["transaction_type"],
        where: { created_at: { gte: startOfMonth } },
        _sum: { credit_amount: true },
        _count: true,
      }),
    ]);

    // Calculate granted vs spent this month
    let creditsGrantedThisMonth = 0;
    let creditsSpentThisMonth = 0;
    for (const stat of monthStats) {
      const amount = stat._sum.credit_amount || 0;
      if (stat.transaction_type === "credit" || stat.transaction_type === "referral_bonus" || stat.transaction_type === "reward") {
        creditsGrantedThisMonth += amount;
      } else {
        creditsSpentThisMonth += Math.abs(amount);
      }
    }

    // Recent transactions (last 20)
    const recentTransactions = await db.creditTransaction.findMany({
      orderBy: { created_at: "desc" },
      take: 20,
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    // Top orgs by balance
    const topOrgs = await db.organization.findMany({
      orderBy: { credits_balance: "desc" },
      take: 10,
      select: { id: true, name: true, credits_balance: true },
    });

    // Reward config from PlatformSetting
    const rewardSettings = await db.platformSetting.findMany({
      where: {
        setting_key: { startsWith: "credit_reward_" },
      },
      select: { setting_key: true, setting_value: true },
    });

    const rewardConfig: Record<string, number> = {};
    for (const s of rewardSettings) {
      const key = s.setting_key.replace("credit_reward_", "");
      rewardConfig[key] = parseInt(s.setting_value, 10);
    }

    return NextResponse.json({
      totalCreditsInSystem: orgStats._sum.credits_balance || 0,
      totalOrgs: orgStats._count,
      totalTransactions,
      transactionsThisMonth,
      creditsGrantedThisMonth,
      creditsSpentThisMonth,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        organization_id: t.organization_id,
        organization_name: t.organization?.name ?? "—",
        transaction_type: t.transaction_type,
        credit_amount: t.credit_amount,
        description: t.description,
        created_at: t.created_at,
      })),
      topOrgsByBalance: topOrgs.map((o) => ({
        org_id: o.id,
        name: o.name,
        credits_balance: o.credits_balance,
      })),
      rewardConfig,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[SUPERADMIN_CREDITS_DASHBOARD]", error);
    return NextResponse.json({ error: "Failed to fetch credits dashboard" }, { status: 500 });
  }
}
