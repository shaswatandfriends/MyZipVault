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

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Default to today if no date provided
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam + "T00:00:00");
    } else {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
    }

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Fetch schedules for the target date
    const schedules = await db.callSchedule.findMany({
      where: {
        recruiter_user_id: userId,
        status: "scheduled",
        scheduled_date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            specialty: true,
            pipeline_stage: true,
            star_rating: true,
            remark: true,
            reached_for: true,
          },
        },
      },
      orderBy: { scheduled_date: "asc" },
    });

    // Also include month-range schedules that cover this month
    const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
    const monthSchedules = await db.callSchedule.findMany({
      where: {
        recruiter_user_id: userId,
        status: "scheduled",
        scheduled_month: yearMonth,
        scheduled_date: null,
      },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            specialty: true,
            pipeline_stage: true,
            star_rating: true,
            remark: true,
            reached_for: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    // Get recruiter info
    const recruiter = await db.user.findUnique({
      where: { id: userId },
      select: {
        first_name: true,
        last_name: true,
        organization_id: true,
        organization: {
          select: { name: true },
        },
      },
    });

    const recruiterName = recruiter
      ? `${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""}`.trim()
      : "Unknown";
    const organizationName = recruiter?.organization?.name ?? "Unknown Organization";

    // Build call sheet entries
    const calls = [
      ...schedules.map((s) => ({
        id: s.id,
        leadName: s.lead ? `${s.lead.first_name} ${s.lead.last_name}` : "Unknown",
        phone: s.lead?.phone ?? "",
        email: s.lead?.email ?? "",
        specialty: s.lead?.specialty ?? "",
        scheduledTime: s.scheduled_date
          ? new Date(s.scheduled_date).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : "",
        pipelineStage: s.lead?.pipeline_stage ?? "",
        remark: s.lead?.remark ?? "",
        reachedFor: s.lead?.reached_for ?? "",
        starRating: s.lead?.star_rating ?? null,
      })),
      ...monthSchedules.map((s) => ({
        id: s.id,
        leadName: s.lead ? `${s.lead.first_name} ${s.lead.last_name}` : "Unknown",
        phone: s.lead?.phone ?? "",
        email: s.lead?.email ?? "",
        specialty: s.lead?.specialty ?? "",
        scheduledTime: `Month: ${s.scheduled_month}`,
        pipelineStage: s.lead?.pipeline_stage ?? "",
        remark: s.lead?.remark ?? "",
        reachedFor: s.lead?.reached_for ?? "",
        starRating: s.lead?.star_rating ?? null,
      })),
    ];

    // Sort by scheduled time (specific times first, then month-range)
    calls.sort((a, b) => {
      if (!a.scheduledTime && !b.scheduledTime) return 0;
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      if (a.scheduledTime.startsWith("Month:") && !b.scheduledTime.startsWith("Month:")) return 1;
      if (!a.scheduledTime.startsWith("Month:") && b.scheduledTime.startsWith("Month:")) return -1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    const dateStr = targetDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return NextResponse.json({
      calls,
      recruiterName,
      organizationName,
      date: dateStr,
      dateISO: dateParam ?? targetDate.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_DAILY_CALL_SHEET_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch daily call sheet" },
      { status: 500 }
    );
  }
}
