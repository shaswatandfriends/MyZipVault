import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "30d";

    // Calculate date range
    const now = new Date();
    let fromDate: Date;
    switch (dateRange) {
      case "7d":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        fromDate = new Date(0);
        break;
      default: // 30d
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // MRR / ARR — total credit purchase revenue this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const creditPurchases = await db.creditTransaction.findMany({
      where: {
        transaction_type: "purchase",
        created_at: { gte: startOfMonth },
      },
      include: { organization: true },
    });

    const mrr = creditPurchases.reduce((sum, tx) => sum + tx.credit_amount, 0);
    // Estimate ARR from credit cost
    const creditCostSetting = await db.platformSetting.findUnique({
      where: { setting_key: "credit_cost_checklist" },
    });
    const pricePerCredit = creditCostSetting ? parseFloat(creditCostSetting.setting_value) || 1 : 1;
    const mrrDollars = mrr * pricePerCredit;
    const arrDollars = mrrDollars * 12;

    // Credits purchased vs spent by month (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allTransactions = await db.creditTransaction.findMany({
      where: { created_at: { gte: sixMonthsAgo } },
    });

    const monthlyCredits: Record<string, { purchased: number; spent: number }> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyCredits[key] = { purchased: 0, spent: 0 };
    }

    for (const tx of allTransactions) {
      const d = new Date(tx.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyCredits[key]) {
        if (tx.transaction_type === "purchase") {
          monthlyCredits[key].purchased += tx.credit_amount;
        } else if (tx.transaction_type === "spend" || tx.transaction_type === "deduction") {
          monthlyCredits[key].spent += tx.credit_amount;
        }
      }
    }

    const creditsByMonth = Object.entries(monthlyCredits)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    // Agency burn rates
    const orgs = await db.organization.findMany();
    const agencyBurnRates = await Promise.all(
      orgs.map(async (org) => {
        const purchased = await db.creditTransaction.aggregate({
          _sum: { credit_amount: true },
          where: { organization_id: org.id, transaction_type: "purchase", created_at: { gte: fromDate } },
        });
        const spent = await db.creditTransaction.aggregate({
          _sum: { credit_amount: true },
          where: { organization_id: org.id, transaction_type: { in: ["spend", "deduction"] }, created_at: { gte: fromDate } },
        });
        const purchasedAmt = purchased._sum.credit_amount || 0;
        const spentAmt = spent._sum.credit_amount || 0;
        const remaining = org.credits_balance;

        // Calculate months in range
        const monthsInRange = Math.max(1, Math.ceil((now.getTime() - fromDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
        const burnRate = Math.round(spentAmt / monthsInRange);

        return {
          organizationId: org.id,
          organizationName: org.name,
          creditsPurchased: purchasedAmt,
          creditsSpent: spentAmt,
          remaining,
          burnRate,
        };
      })
    );

    // Candidate funnel
    const totalSignups = await db.user.count({ where: { role: "candidate", created_at: { gte: fromDate } } });
    const profileComplete = await db.user.count({
      where: {
        role: "candidate",
        created_at: { gte: fromDate },
        candidate_profile: { profile_completion_pct: { gte: 80 } },
      },
    });
    const firstChecklist = await db.user.count({
      where: {
        role: "candidate",
        created_at: { gte: fromDate },
        candidate_checklist_responses: { some: { status: "active" } },
      },
    });
    const firstShare = await db.user.count({
      where: {
        role: "candidate",
        created_at: { gte: fromDate },
        consent_shares_as_candidate: { some: {} },
      },
    });

    const candidateFunnel = {
      signup: totalSignups,
      profileComplete,
      firstChecklist,
      firstShare,
    };

    // Most requested checklists
    const checklistRequests = await db.checklistRequest.groupBy({
      by: ["checklist_template_id"],
      where: { created_at: { gte: fromDate } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const templateIds = checklistRequests.map((r) => r.checklist_template_id);
    const templates = await db.checklistTemplate.findMany({
      where: { id: { in: templateIds } },
    });

    const mostRequestedChecklists = checklistRequests.map((r) => {
      const template = templates.find((t) => t.id === r.checklist_template_id);
      return {
        checklistTemplateId: r.checklist_template_id,
        checklistName: template ? `${template.name} (${template.profession}${template.specialty ? ` - ${template.specialty}` : ""})` : `Template #${r.checklist_template_id}`,
        requestCount: r._count.id,
      };
    });

    return NextResponse.json({
      mrr: mrrDollars,
      arr: arrDollars,
      creditsByMonth,
      agencyBurnRates,
      candidateFunnel,
      mostRequestedChecklists,
    });
  } catch (error) {
    console.error("Superadmin Analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
