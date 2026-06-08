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
    const monthParam = searchParams.get("month"); // YYYY-MM
    const companyIdParam = searchParams.get("companyId");
    const recruiterIdParam = searchParams.get("recruiterId"); // For weekly calls detail

    // Parse the target month (default: current month)
    const now = new Date();
    let targetYear: number;
    let targetMonth: number; // 0-indexed for Date constructor

    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      if (!y || !m || m < 1 || m > 12) {
        return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
      }
      targetYear = y;
      targetMonth = m - 1;
    } else {
      targetYear = now.getFullYear();
      targetMonth = now.getMonth();
    }

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 1);

    // Build organization filter
    const orgFilter = companyIdParam
      ? { organization_id: parseInt(companyIdParam, 10) }
      : {};

    // ── 1. Daily Call Counts ──────────────────────────────────────────
    const callSchedules = await db.callSchedule.findMany({
      where: {
        scheduled_date: { gte: monthStart, lt: monthEnd },
        ...orgFilter,
      },
      select: {
        scheduled_date: true,
        status: true,
      },
    });

    // Initialize all days of the month
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const dailyMap: Record<string, { scheduled: number; completed: number; missed: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dailyMap[key] = { scheduled: 0, completed: 0, missed: 0 };
    }

    for (const cs of callSchedules) {
      if (!cs.scheduled_date) continue;
      const d = new Date(cs.scheduled_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dailyMap[key]) continue;

      if (cs.status === "completed") {
        dailyMap[key].completed++;
      } else if (cs.status === "no_answer" || cs.status === "cancelled") {
        dailyMap[key].missed++;
      } else if (cs.status === "scheduled" || cs.status === "rescheduled") {
        // Past dates that are still "scheduled" are overdue
        const scheduleDate = new Date(cs.scheduled_date);
        if (scheduleDate < now && cs.status === "scheduled") {
          dailyMap[key].missed++;
        } else {
          dailyMap[key].scheduled++;
        }
      }
    }

    const dailyCallCounts = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // ── 2. Recruiter Stats ────────────────────────────────────────────
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

    // Get all recruiters (users with role "recruiter" in organizations)
    const recruiterWhere: Record<string, unknown> = { role: "recruiter" };
    if (companyIdParam) {
      recruiterWhere.organization_id = parseInt(companyIdParam, 10);
    }

    const recruiters = await db.user.findMany({
      where: recruiterWhere,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        organization: {
          select: { name: true },
        },
      },
    });

    const recruiterStats = await Promise.all(
      recruiters.map(async (recruiter) => {
        const leadFilter = {
          recruiter_user_id: recruiter.id,
          ...(companyIdParam ? { organization_id: parseInt(companyIdParam, 10) } : {}),
        };

        // Active leads
        const activeLeads = await db.recruiterLead.count({
          where: { ...leadFilter, is_active: true },
        });

        // Calls today (call logs)
        const callsToday = await db.callLog.count({
          where: {
            recruiter_user_id: recruiter.id,
            call_date: { gte: todayStart },
          },
        });

        // Calls this week (call logs)
        const callsWeek = await db.callLog.count({
          where: {
            recruiter_user_id: recruiter.id,
            call_date: { gte: weekStart },
          },
        });

        // Overdue calls (scheduled in the past, still "scheduled" status)
        const overdueCalls = await db.callSchedule.count({
          where: {
            recruiter_user_id: recruiter.id,
            status: "scheduled",
            scheduled_date: { lt: now },
          },
        });

        return {
          recruiterId: recruiter.id,
          name: `${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""}`.trim() || "Unknown",
          organization: recruiter.organization?.name ?? "No Organization",
          activeLeads,
          callsToday,
          callsWeek,
          overdueCalls,
        };
      })
    );

    // Sort by calls this week descending
    recruiterStats.sort((a, b) => b.callsWeek - a.callsWeek);

    // ── 3. Pipeline Overview ──────────────────────────────────────────
    const pipelineStages = [
      "new_lead",
      "doc_pending",
      "submitted",
      "interested_no_job",
      "interview_scheduled",
      "offer_sent",
      "onboarding",
      "started",
      "not_interested",
    ];

    const stageLabels: Record<string, string> = {
      new_lead: "New Lead",
      doc_pending: "Doc Pending",
      submitted: "Submitted",
      interested_no_job: "Interested",
      interview_scheduled: "Interview Scheduled",
      offer_sent: "Offer Sent",
      onboarding: "Onboarding",
      started: "Started",
      not_interested: "Not Interested",
    };

    const pipelineOverview = await Promise.all(
      pipelineStages.map(async (stage) => {
        const count = await db.recruiterLead.count({
          where: {
            pipeline_stage: stage,
            is_active: true,
            ...(companyIdParam ? { organization_id: parseInt(companyIdParam, 10) } : {}),
          },
        });
        return {
          stage,
          label: stageLabels[stage] || stage,
          count,
        };
      })
    );

    // ── 4. Recruiter Weekly Calls (optional, when recruiterId is provided) ──
    let recruiterWeeklyCalls: {
      id: number;
      leadName: string;
      scheduledDate: string;
      status: string;
    }[] = [];

    if (recruiterIdParam) {
      const rid = parseInt(recruiterIdParam, 10);
      const weekStartForCalls = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

      const schedules = await db.callSchedule.findMany({
        where: {
          recruiter_user_id: rid,
          scheduled_date: { gte: weekStartForCalls },
        },
        include: {
          lead: {
            select: { first_name: true, last_name: true },
          },
        },
        orderBy: { scheduled_date: "asc" },
      });

      recruiterWeeklyCalls = schedules.map((s) => ({
        id: s.id,
        leadName: `${s.lead.first_name} ${s.lead.last_name}`.trim(),
        scheduledDate: s.scheduled_date ? new Date(s.scheduled_date).toISOString() : "",
        status: s.status,
      }));
    }

    return NextResponse.json({
      dailyCallCounts,
      recruiterStats,
      pipelineOverview,
      recruiterWeeklyCalls,
    });
  } catch (error) {
    console.error("Superadmin Calendar GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
