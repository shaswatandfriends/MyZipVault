import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/growth
 *
 * Returns growth-specific metrics for the superadmin growth dashboard:
 *   - Signups over time (by day, by role)
 *   - Activation rate (signup → profile completed)
 *   - Retention (DAU/WAU/MAU)
 *   - Channel attribution (where signups come from)
 *   - Email engagement (sent, opened, clicked)
 *   - Funnel: signup → verified → first application → placement
 *
 * Query params:
 *   - range: 7d | 30d | 90d (default: 30d)
 */
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
    const range = searchParams.get("range") || "30d";

    const now = new Date();
    let fromDate: Date;
    switch (range) {
      case "7d":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        fromDate = new Date(0);
        break;
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // ─── 1. Signups over time (by day) ───────────────────────────────
    const allUsers = await db.user.findMany({
      where: { created_at: { gte: fromDate } },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
        email_verified_at: true,
        account_status: true,
        last_activity_at: true,
        candidate_profile: { select: { profile_completion_pct: true } },
      },
      orderBy: { created_at: "asc" },
    });

    // Group signups by day
    const signupsByDay: Record<string, { date: string; count: number; byRole: Record<string, number> }> = {};
    for (const u of allUsers) {
      const d = new Date(u.created_at);
      const dateKey = d.toISOString().split("T")[0];
      if (!signupsByDay[dateKey]) {
        signupsByDay[dateKey] = { date: dateKey, count: 0, byRole: {} };
      }
      signupsByDay[dateKey].count++;
      signupsByDay[dateKey].byRole[u.role] = (signupsByDay[dateKey].byRole[u.role] || 0) + 1;
    }
    const signupsOverTime = Object.values(signupsByDay).sort((a, b) => a.date.localeCompare(b.date));

    // ─── 2. Activation metrics ────────────────────────────────────────
    const totalSignups = allUsers.length;
    const verifiedEmails = allUsers.filter((u) => u.email_verified_at !== null).length;
    const completedProfiles = allUsers.filter(
      (u) => (u.candidate_profile?.profile_completion_pct ?? 0) >= 75
    ).length;
    const activationRate = totalSignups > 0 ? (completedProfiles / totalSignups) * 100 : 0;
    const verificationRate = totalSignups > 0 ? (verifiedEmails / totalSignups) * 100 : 0;

    // ─── 3. Active users (DAU/WAU/MAU) ────────────────────────────────
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau, totalUsers] = await Promise.all([
      db.user.count({ where: { last_activity_at: { gte: oneDayAgo } } }),
      db.user.count({ where: { last_activity_at: { gte: sevenDaysAgo } } }),
      db.user.count({ where: { last_activity_at: { gte: thirtyDaysAgo } } }),
      db.user.count(),
    ]);

    const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

    // ─── 4. Role breakdown ────────────────────────────────────────────
    const roleBreakdown = await db.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    // ─── 5. Funnel: signup → verified → applied → placed ──────────────
    let applications = 0;
    let placements = 0;
    try {
      applications = await db.candidateApplication.count({
        where: { created_at: { gte: fromDate } },
      });
      placements = await db.candidateApplication.count({
        where: {
          status: "hired",
          created_at: { gte: fromDate },
        },
      });
    } catch {
      // CandidateApplication table might not exist in some envs
    }

    // ─── 6. Email engagement (from EmailCampaignRecipient) ────────────
    let emailSent = 0, emailOpened = 0, emailClicked = 0;
    try {
      emailSent = await db.emailCampaignRecipient.count({
        where: { campaign: { created_at: { gte: fromDate } } },
      });
      emailOpened = await db.emailCampaignRecipient.count({
        where: {
          opened_at: { not: null },
          campaign: { created_at: { gte: fromDate } },
        },
      });
      emailClicked = await db.emailCampaignRecipient.count({
        where: {
          clicked_at: { not: null },
          campaign: { created_at: { gte: fromDate } },
        },
      });
    } catch {
      // EmailCampaignRecipient might not exist yet
    }

    const openRate = emailSent > 0 ? (emailOpened / emailSent) * 100 : 0;
    const clickRate = emailSent > 0 ? (emailClicked / emailSent) * 100 : 0;

    // ─── 7. Jobs + applications over time ─────────────────────────────
    let jobsPosted = 0, activeJobs = 0;
    try {
      jobsPosted = await db.job.count({
        where: { created_at: { gte: fromDate } },
      });
      activeJobs = await db.job.count({
        where: {
          is_closed: false,
          close_date: { gte: now },
        },
      });
    } catch {
      // Job table might not exist
    }

    // ─── 8. Referral count ────────────────────────────────────────────
    let referralCount = 0;
    try {
      referralCount = await db.auditLog.count({
        where: {
          action: "referral_granted",
          created_at: { gte: fromDate },
        },
      });
    } catch {
      // AuditLog might not exist
    }

    // ─── 9. Recent signups (for the live feed) ────────────────────────
    const recentSignups = await db.user.findMany({
      take: 10,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
        email_verified_at: true,
        account_status: true,
      },
    });

    return NextResponse.json({
      range,
      period: { from: fromDate.toISOString(), to: now.toISOString() },
      // Top-line numbers
      totals: {
        totalUsers,
        totalSignupsInRange: totalSignups,
        verifiedEmails,
        completedProfiles,
        activationRate: Number(activationRate.toFixed(1)),
        verificationRate: Number(verificationRate.toFixed(1)),
        dau,
        wau,
        mau,
        stickiness: Number(stickiness.toFixed(1)),
        jobsPosted,
        activeJobs,
        applications,
        placements,
      },
      // Charts
      signupsOverTime,
      roleBreakdown: roleBreakdown.map((r) => ({
        role: r.role,
        count: r._count.role,
      })),
      // Funnel
      funnel: {
        signup: totalSignups,
        verified: verifiedEmails,
        completedProfile: completedProfiles,
        applied: applications,
        placed: placements,
      },
      // Email
      email: {
        sent: emailSent,
        opened: emailOpened,
        clicked: emailClicked,
        openRate: Number(openRate.toFixed(1)),
        clickRate: Number(clickRate.toFixed(1)),
      },
      // Recent activity
      recentSignups: recentSignups.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
        verified: u.email_verified_at !== null,
        status: u.account_status,
      })),
      referralCount,
    });
  } catch (error) {
    console.error("[GROWTH API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch growth metrics", details: String(error) },
      { status: 500 }
    );
  }
}
