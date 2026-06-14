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
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Users by role
    const candidates = await db.user.count({ where: { role: "candidate" } });
    const clientRecruiters = await db.user.count({ where: { role: "client_recruiter" } });
    const clientAdmins = await db.user.count({ where: { role: "client_admin" } });
    const platformAdmins = await db.user.count({ where: { role: { in: ["platform_admin", "super_admin"] } } });

    // Pending documents count
    const pendingDocuments = await db.credential.count({
      where: { verification_status: "pending_review" },
    });

    // Recent signups this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentSignups = await db.user.count({
      where: { created_at: { gte: oneWeekAgo } },
    });

    // Document verification queue size (same as pending for now)
    const documentQueueSize = pendingDocuments;

    // Recent signups list (last 5)
    const recentSignupList = await db.user.findMany({
      where: { created_at: { gte: oneWeekAgo } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    // Pending verification queue preview (last 5)
    const pendingVerificationPreview = await db.credential.findMany({
      where: { verification_status: "pending_review" },
      select: {
        id: true,
        document_name: true,
        uploaded_at: true,
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { uploaded_at: "desc" },
      take: 5,
    });

    // Pending reminders count
    const pendingReminders = await db.pendingReminder.count({
      where: { status: "awaiting_approval" },
    });

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
        total: candidates + clientRecruiters + clientAdmins + platformAdmins,
      },
      pendingDocuments,
      recentSignups,
      documentQueueSize,
      recentSignupList: recentSignupList.map((u) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
      })),
      pendingVerificationPreview: pendingVerificationPreview.map((c) => ({
        id: c.id,
        documentName: c.document_name,
        uploadedAt: c.uploaded_at,
        candidate: {
          id: c.candidate_user.id,
          firstName: c.candidate_user.first_name,
          lastName: c.candidate_user.last_name,
          email: c.candidate_user.email,
        },
      })),
      pendingReminders,
      userGrowth,
    });
  } catch (error) {
    console.error("Admin Dashboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
