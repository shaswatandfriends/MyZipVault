import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Cron endpoint to process due reminders
export async function GET() {
  try {
    const now = new Date();

    // Find all follow_up_reminders where:
    // - status = pending
    // - scheduled_for <= now
    // - (snoozed_until IS NULL OR snoozed_until <= now)
    const dueReminders = await db.followUpReminder.findMany({
      where: {
        status: "pending",
        scheduled_for: { lte: now },
        OR: [
          { snoozed_until: null },
          { snoozed_until: { lte: now } },
        ],
      },
      include: {
        lead: { select: { id: true, first_name: true, last_name: true, phone: true } },
        call_schedule: { select: { id: true, schedule_type: true, scheduled_date: true, scheduled_month: true, scheduled_year: true, status: true } },
      },
      take: 500,
    });

    let processedCount = 0;
    let monthRangeCreated = 0;

    for (const reminder of dueReminders) {
      // Create notification for recruiter
      const leadName = `${reminder.lead.first_name} ${reminder.lead.last_name}`;
      let message = "";

      switch (reminder.reminder_type) {
        case "day_before":
          message = `Reminder: You have a call scheduled tomorrow with ${leadName}.`;
          break;
        case "day_of":
          message = `Reminder: You have a call scheduled today with ${leadName}.`;
          break;
        case "thirty_min_after":
          message = `Follow-up: Your call with ${leadName} was 30 minutes ago. Log the outcome.`;
          break;
        case "day_after_no_update":
          message = `No update on yesterday's call with ${leadName}. Follow up?`;
          break;
        case "month_range_daily":
          message = `Daily reminder: Follow up with ${leadName} this month.`;
          break;
        default:
          message = `Reminder: Follow up with ${leadName}.`;
      }

      await db.notification.create({
        data: {
          user_id: reminder.recruiter_user_id,
          message,
          type: "follow_up_reminder",
          related_entity_id: reminder.lead_id,
          action_data: JSON.stringify({
            reminder_id: reminder.id,
            lead_id: reminder.lead_id,
            call_schedule_id: reminder.call_schedule_id,
            reminder_type: reminder.reminder_type,
          }),
        },
      });

      // Set status to sent
      await db.followUpReminder.update({
        where: { id: reminder.id },
        data: { status: "sent" },
      });

      // For month_range_daily: auto-create next day's reminder if still active
      if (reminder.reminder_type === "month_range_daily" && reminder.call_schedule) {
        const schedule = reminder.call_schedule;
        if (schedule.status === "pending" && schedule.scheduled_month && schedule.scheduled_year) {
          const nextDay = new Date(reminder.scheduled_for);
          nextDay.setDate(nextDay.getDate() + 1);

          // Check if next day is still within the target month
          if (
            nextDay.getMonth() + 1 === schedule.scheduled_month &&
            nextDay.getFullYear() === schedule.scheduled_year
          ) {
            await db.followUpReminder.create({
              data: {
                lead_id: reminder.lead_id,
                call_schedule_id: reminder.call_schedule_id,
                recruiter_user_id: reminder.recruiter_user_id,
                reminder_type: "month_range_daily",
                scheduled_for: nextDay,
              },
            });
            monthRangeCreated++;
          }
        }
      }

      processedCount++;
    }

    return NextResponse.json({
      processed: processedCount,
      monthRangeRemindersCreated: monthRangeCreated,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[CRON_CALENDAR_REMINDERS_GET]", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
