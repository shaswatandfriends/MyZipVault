import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper: generate follow-up reminders for specific_date
async function generateSpecificDateReminders(
  leadId: number,
  scheduleId: number,
  recruiterUserId: number,
  scheduledDate: Date
) {
  const dayBefore = new Date(scheduledDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0, 0);

  const dayOf = new Date(scheduledDate);
  dayOf.setHours(8, 0, 0, 0);

  const thirtyMinAfter = new Date(scheduledDate);
  thirtyMinAfter.setMinutes(thirtyMinAfter.getMinutes() + 30);

  const dayAfterNoUpdate = new Date(scheduledDate);
  dayAfterNoUpdate.setDate(dayAfterNoUpdate.getDate() + 1);
  dayAfterNoUpdate.setHours(9, 0, 0, 0);

  await db.followUpReminder.createMany({
    data: [
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "day_before", scheduled_for: dayBefore },
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "day_of", scheduled_for: dayOf },
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "thirty_min_after", scheduled_for: thirtyMinAfter },
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "day_after_no_update", scheduled_for: dayAfterNoUpdate },
    ],
  });
}

// Helper: generate follow-up reminders for month_range
async function generateMonthRangeReminders(
  leadId: number,
  scheduleId: number,
  recruiterUserId: number,
  scheduledMonth: number,
  scheduledYear: number
) {
  const firstDay = new Date(scheduledYear, scheduledMonth - 1, 1, 9, 0, 0, 0);

  await db.followUpReminder.create({
    data: {
      lead_id: leadId,
      call_schedule_id: scheduleId,
      recruiter_user_id: recruiterUserId,
      reminder_type: "month_range_daily",
      scheduled_for: firstDay,
    },
  });
}

// POST: Create call schedule
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { lead_id, schedule_type, scheduled_date, scheduled_month, scheduled_year, remark } = body;

    if (!lead_id || !schedule_type) {
      return NextResponse.json({ error: "Missing required fields: lead_id, schedule_type" }, { status: 400 });
    }

    const validScheduleTypes = ["specific_date", "month_range"];
    if (!validScheduleTypes.includes(schedule_type)) {
      return NextResponse.json({ error: "Invalid schedule_type. Must be: specific_date, month_range" }, { status: 400 });
    }

    if (schedule_type === "specific_date" && !scheduled_date) {
      return NextResponse.json({ error: "scheduled_date is required for specific_date schedule type" }, { status: 400 });
    }
    if (schedule_type === "month_range" && (!scheduled_month || !scheduled_year)) {
      return NextResponse.json({ error: "scheduled_month and scheduled_year are required for month_range schedule type" }, { status: 400 });
    }

    // Verify the lead belongs to the authenticated recruiter
    const lead = await db.recruiterLead.findUnique({
      where: { id: Number(lead_id), is_deleted: false },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    if (userRole === "client_recruiter" && lead.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "You can only schedule calls for your own leads" }, { status: 403 });
    }
    if (userRole === "client_admin" && lead.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create the schedule
    const scheduleData: Record<string, unknown> = {
      lead_id: Number(lead_id),
      recruiter_user_id: userId,
      schedule_type,
      remark: remark || null,
    };

    if (schedule_type === "specific_date") {
      scheduleData.scheduled_date = new Date(scheduled_date);
    } else if (schedule_type === "month_range") {
      scheduleData.scheduled_month = Number(scheduled_month);
      scheduleData.scheduled_year = Number(scheduled_year);
    }

    const callSchedule = await db.callSchedule.create({
      data: scheduleData as Parameters<typeof db.callSchedule.create>[0]["data"],
    });

    // Generate follow-up reminders
    if (schedule_type === "specific_date" && scheduled_date) {
      await generateSpecificDateReminders(Number(lead_id), callSchedule.id, userId, new Date(scheduled_date));
    } else if (schedule_type === "month_range" && scheduled_month && scheduled_year) {
      await generateMonthRangeReminders(Number(lead_id), callSchedule.id, userId, Number(scheduled_month), Number(scheduled_year));
    }

    // Return the schedule with reminders
    const fullSchedule = await db.callSchedule.findUnique({
      where: { id: callSchedule.id },
      include: {
        lead: { select: { id: true, first_name: true, last_name: true, phone: true } },
        follow_up_reminders: { orderBy: { scheduled_for: "asc" } },
      },
    });

    return NextResponse.json({ schedule: fullSchedule }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_SCHEDULES_POST]", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

// GET: List schedules for the recruiter with filters
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const schedule_type = searchParams.get("schedule_type");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const lead_id = searchParams.get("lead_id");
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (userRole === "client_recruiter") {
      where.recruiter_user_id = userId;
    } else if (userRole === "client_admin" && organizationId) {
      // Get org member ids
      const orgUsers = await db.user.findMany({
        where: { organization_id: organizationId, role: { in: ["client_recruiter", "client_admin"] } },
        select: { id: true },
      });
      where.recruiter_user_id = { in: orgUsers.map((u) => u.id) };
    }

    if (status) where.status = status;
    if (schedule_type) where.schedule_type = schedule_type;
    if (lead_id) where.lead_id = Number(lead_id);

    if (date_from || date_to) {
      const scheduledDateFilter: Record<string, unknown> = {};
      if (date_from) scheduledDateFilter.gte = new Date(date_from);
      if (date_to) scheduledDateFilter.lte = new Date(date_to);
      where.scheduled_date = scheduledDateFilter;
    }

    const [schedules, total] = await Promise.all([
      db.callSchedule.findMany({
        where,
        include: {
          lead: { select: { id: true, first_name: true, last_name: true, phone: true, pipeline_stage: true } },
          recruiter_user: { select: { id: true, first_name: true, last_name: true } },
          follow_up_reminders: { where: { status: "pending" }, orderBy: { scheduled_for: "asc" } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      db.callSchedule.count({ where }),
    ]);

    return NextResponse.json({
      schedules,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[CALENDAR_SCHEDULES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}
