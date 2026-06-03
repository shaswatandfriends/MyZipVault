import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Users by role
    const [candidates, clientRecruiters, clientAdmins, platformAdmins, superAdmins] =
      await Promise.all([
        db.user.count({ where: { role: "candidate" } }),
        db.user.count({ where: { role: "client_recruiter" } }),
        db.user.count({ where: { role: "client_admin" } }),
        db.user.count({ where: { role: "platform_admin" } }),
        db.user.count({ where: { role: "super_admin" } }),
      ]);

    const totalUsers = candidates + clientRecruiters + clientAdmins + platformAdmins + superAdmins;

    // Revenue this month — sum of all purchase transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const purchasesThisMonth = await db.creditTransaction.findMany({
      where: {
        transaction_type: "purchase",
        created_at: { gte: startOfMonth },
      },
      select: { credit_amount: true },
    });
    const revenueThisMonth = purchasesThisMonth.reduce((sum, t) => sum + t.credit_amount, 0);

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
      creditsPurchasedToday: purchasedToday._sum.credit_amount ?? 0,
      creditsSpentToday: spentToday._sum.credit_amount ?? 0,
      creditsPurchasedMonth: purchasedMonth._sum.credit_amount ?? 0,
      creditsSpentMonth: spentMonth._sum.credit_amount ?? 0,
      pendingAdminApprovals,
      errorCountToday,
      activeAnnouncements,
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
    });
  } catch (error) {
    console.error("Superadmin Dashboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
