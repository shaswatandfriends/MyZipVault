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

    // Parse period query param
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    let periodDate: Date | null = null;
    const now = new Date();
    if (period === "week") {
      periodDate = new Date(now);
      periodDate.setDate(periodDate.getDate() - 7);
    } else if (period === "month") {
      periodDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Users by role (optionally filtered by period)
    const userWhere = periodDate ? { created_at: { gte: periodDate } } : {};
    const [candidates, clientRecruiters, clientAdmins, platformAdmins, superAdmins] =
      await Promise.all([
        db.user.count({ where: { role: "candidate", ...userWhere } }),
        db.user.count({ where: { role: "client_recruiter", ...userWhere } }),
        db.user.count({ where: { role: "client_admin", ...userWhere } }),
        db.user.count({ where: { role: "platform_admin", ...userWhere } }),
        db.user.count({ where: { role: "super_admin", ...userWhere } }),
      ]);

    const totalUsers = candidates + clientRecruiters + clientAdmins + platformAdmins + superAdmins;

    // Credits sold this month — sum of all purchase transaction credit_amounts.
    // NOTE: This is the CREDIT COUNT, not dollar revenue. Dollar revenue
    // comes from paid invoices (Invoice.total_price) — computed separately
    // below as `revenueThisMonth`.
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const purchasesThisMonth = await db.creditTransaction.findMany({
      where: {
        transaction_type: "purchase",
        created_at: { gte: startOfMonth },
      },
      select: { credit_amount: true },
    });
    const creditsSoldThisMonth = purchasesThisMonth.reduce((sum, t) => sum + t.credit_amount, 0);

    // Actual dollar revenue this month — sum of Invoice.total_price for
    // invoices that have been paid (pdf_url starts with "stripe_paid:").
    // Unpaid invoices (pdf_url starts with "stripe_session:" or is null)
    // are NOT counted as revenue.
    const invoicesThisMonth = await db.invoice.aggregate({
      _sum: { total_price: true },
      where: {
        created_at: { gte: startOfMonth },
        pdf_url: { startsWith: "stripe_paid:" },
      },
    });
    const revenueThisMonth = invoicesThisMonth._sum.total_price ?? 0;

    // Credits purchased vs spent today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [purchasedToday, spentToday] = await Promise.all([
      db.creditTransaction.aggregate({
        _sum: { credit_amount: true },
        where: { transaction_type: "purchase", created_at: { gte: startOfToday } },
      }),
      db.creditTransaction.aggregate({
        _sum: { credit_amount: true },
        where: { transaction_type: { in: ["spend", "deduction"] }, created_at: { gte: startOfToday } },
      }),
    ]);

    // Pending admin approvals
    const pendingAdminApprovals = await db.user.count({
      where: { role: "platform_admin", is_approved: false },
    });

    // Error count today
    const errorCountToday = await db.systemErrorLog.count({
      where: { created_at: { gte: startOfToday } },
    });

    // Active announcements
    const activeAnnouncements = await db.announcement.count({
      where: { is_active: true },
    });

    // Organizations count
    const organizationsCount = await db.organization.count();

    // Last 5 errors
    const recentErrors = await db.systemErrorLog.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        severity: true,
        service: true,
        error_message: true,
        created_at: true,
      },
    });

    // Last 5 signups
    const recentSignups = await db.user.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    // Pending admin approval list
    const pendingAdminList = await db.user.findMany({
      where: { role: "platform_admin", is_approved: false },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Credits purchased vs spent this month (for bar comparison)
    const [purchasedMonth, spentMonth] = await Promise.all([
      db.creditTransaction.aggregate({
        _sum: { credit_amount: true },
        where: { transaction_type: "purchase", created_at: { gte: startOfMonth } },
      }),
      db.creditTransaction.aggregate({
        _sum: { credit_amount: true },
        where: { transaction_type: { in: ["spend", "deduction"] }, created_at: { gte: startOfMonth } },
      }),
    ]);

    // User growth by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentUsersForChart = await db.user.findMany({
      where: { created_at: { gte: sixMonthsAgo } },
      select: { role: true, created_at: true },
      orderBy: { created_at: "asc" },
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthData: Record<string, { candidates: number; recruiters: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthData[key] = { candidates: 0, recruiters: 0 };
    }
    for (const u of recentUsersForChart) {
      const d = new Date(u.created_at);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthData[key]) {
        if (u.role === "candidate") monthData[key].candidates++;
        else if (["client_recruiter", "client_admin"].includes(u.role)) monthData[key].recruiters++;
      }
    }
    const userGrowth = Object.entries(monthData).map(([month, counts]) => ({ month, ...counts }));

    return NextResponse.json({
      usersByRole: {
        candidates,
        clientRecruiters,
        clientAdmins,
        platformAdmins,
        superAdmins,
        total: totalUsers,
      },
      revenueThisMonth,
      creditsSoldThisMonth,
      creditsPurchasedToday: purchasedToday._sum.credit_amount ?? 0,
      creditsSpentToday: spentToday._sum.credit_amount ?? 0,
      creditsPurchasedMonth: purchasedMonth._sum.credit_amount ?? 0,
      creditsSpentMonth: spentMonth._sum.credit_amount ?? 0,
      pendingAdminApprovals,
      errorCountToday,
      activeAnnouncements,
      organizationsCount,
      recentErrors: recentErrors.map((e) => ({
        id: e.id,
        severity: e.severity,
        service: e.service,
        errorMessage: e.error_message,
        createdAt: e.created_at,
      })),
      recentSignups: recentSignups.map((u) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
      })),
      pendingAdminList: pendingAdminList.map((a) => ({
        id: a.id,
        firstName: a.first_name,
        lastName: a.last_name,
        email: a.email,
        createdAt: a.created_at,
      })),
      userGrowth,
    });
  } catch (error) {
    console.error("Superadmin Dashboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
