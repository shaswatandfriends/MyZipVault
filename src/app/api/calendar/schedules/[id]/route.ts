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

// PUT: Update/reschedule a call schedule
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const scheduleId = Number(id);

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schedule = await db.callSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Check access
    if (userRole === "client_recruiter" && schedule.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (userRole === "client_admin") {
      const lead = await db.recruiterLead.findUnique({ where: { id: schedule.lead_id } });
      if (lead?.organization_id !== organizationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      schedule_type,
      scheduled_date,
      scheduled_month,
      scheduled_year,
      remark,
      status,
    } = body;

    // Update schedule fields
    const updateData: Record<string, unknown> = {};
    const isRescheduled =
      (scheduled_date && new Date(scheduled_date).getTime() !== schedule.scheduled_date?.getTime()) ||
      (scheduled_month && Number(scheduled_month) !== schedule.scheduled_month) ||
      (scheduled_year && Number(scheduled_year) !== schedule.scheduled_year);

    if (schedule_type !== undefined) updateData.schedule_type = schedule_type;
    if (scheduled_date !== undefined) updateData.scheduled_date = new Date(scheduled_date);
    if (scheduled_month !== undefined) updateData.scheduled_month = Number(scheduled_month);
    if (scheduled_year !== undefined) updateData.scheduled_year = Number(scheduled_year);
    if (remark !== undefined) updateData.remark = remark;
    if (status !== undefined) updateData.status = status;

    // If rescheduling (date/time changed), cancel old pending reminders and create new ones
    if (isRescheduled) {
      // Cancel old pending reminders
      await db.followUpReminder.updateMany({
        where: { call_schedule_id: scheduleId, status: "pending" },
        data: { status: "dismissed" },
      });

      updateData.status = "pending";
    }

    await db.callSchedule.update({
      where: { id: scheduleId },
      data: updateData,
    });

    // If rescheduled, create new reminder set based on new date
    if (isRescheduled) {
      const updatedSchedule = await db.callSchedule.findUnique({ where: { id: scheduleId } });
      const finalScheduleType = schedule_type || updatedSchedule?.schedule_type;
      const finalDate = scheduled_date ? new Date(scheduled_date) : updatedSchedule?.scheduled_date;
      const finalMonth = scheduled_month ? Number(scheduled_month) : updatedSchedule?.scheduled_month;
      const finalYear = scheduled_year ? Number(scheduled_year) : updatedSchedule?.scheduled_year;
      const recruiterId = schedule.recruiter_user_id;
      const leadId = schedule.lead_id;

      if (finalScheduleType === "specific_date" && finalDate) {
        await generateSpecificDateReminders(leadId, scheduleId, recruiterId, finalDate);
      } else if (finalScheduleType === "month_range" && finalMonth && finalYear) {
        await generateMonthRangeReminders(leadId, scheduleId, recruiterId, finalMonth, finalYear);
      }
    }

    // Return updated schedule with relations (preserving call log history)
    const updatedSchedule = await db.callSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        lead: { select: { id: true, first_name: true, last_name: true, phone: true } },
        recruiter_user: { select: { id: true, first_name: true, last_name: true } },
        call_logs: { orderBy: { called_at: "desc" } },
        follow_up_reminders: { orderBy: { scheduled_for: "asc" } },
      },
    });

    return NextResponse.json({ schedule: updatedSchedule });
  } catch (error) {
    console.error("[CALENDAR_SCHEDULE_PUT]", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
