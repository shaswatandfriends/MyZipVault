import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";

// ─── Types ──────────────────────────────────────────────────────────
interface CallScheduleWithLead {
  id: number;
  lead_id: number;
  recruiter_user_id: number;
  scheduled_date: Date | null;
  scheduled_month: string | null;
  status: string;
  created_at: Date;
  lead: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Format a Date to "YYYY-MM-DD" string in UTC */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Format a Date to a friendly time string like "2:00 PM" */
function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

/** Format a Date to a friendly date string like "Mar 15" */
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Format "2026-12" → "December 2026" */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Get the last day of a given month (0-indexed month) */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Check if a notification of the same type for the same call_schedule_id already exists today */
async function notificationExistsToday(
  callScheduleId: number,
  type: string
): Promise<boolean> {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  );
  const endOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  const existing = await db.notification.findFirst({
    where: {
      type,
      related_entity_id: callScheduleId,
      related_entity_type: "call_schedule",
      created_at: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return !!existing;
}

/** Check if a CallLog exists for a given call_schedule_id */
async function callLogExists(callScheduleId: number): Promise<boolean> {
  const log = await db.callLog.findFirst({
    where: { call_schedule_id: callScheduleId },
  });
  return !!log;
}

/** Create a notification for a recruiter about a call */
async function createNotification(params: {
  userId: number;
  type: string;
  title: string;
  message: string;
  callScheduleId: number;
  leadId: number;
  leadName: string;
  scheduledDate: Date | null;
  scheduledMonth: string | null;
}): Promise<boolean> {
  // Deduplication check
  const exists = await notificationExistsToday(params.callScheduleId, params.type);
  if (exists) return false;

  await db.notification.create({
    data: {
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      related_entity_id: params.callScheduleId,
      related_entity_type: "call_schedule",
      metadata: JSON.stringify({
        callScheduleId: params.callScheduleId,
        leadId: params.leadId,
        leadName: params.leadName,
        scheduledDate: params.scheduledDate ? params.scheduledDate.toISOString() : null,
        scheduledMonth: params.scheduledMonth,
      }),
      is_read: false,
    },
  });

  return true;
}

// ─── Core Engine ────────────────────────────────────────────────────

export interface CallNotificationResult {
  day_before: number;
  day_of: number;
  follow_up_30min: number;
  follow_up_day_after: number;
  month_reminder: number;
  month_half_reminder: number;
  month_urgent: number;
  total: number;
}

export async function runCallNotificationEngine(): Promise<CallNotificationResult> {
  const now = new Date();
  const result: CallNotificationResult = {
    day_before: 0,
    day_of: 0,
    follow_up_30min: 0,
    follow_up_day_after: 0,
    month_reminder: 0,
    month_half_reminder: 0,
    month_urgent: 0,
    total: 0,
  };

  // ── 1. Specific-date call schedules ─────────────────────────────
  const specificDateCalls = (await db.callSchedule.findMany({
    where: {
      scheduled_date: { not: null },
      status: { in: ["scheduled", "rescheduled"] },
    },
    include: {
      lead: {
        select: { id: true, first_name: true, last_name: true },
      },
    },
  })) as CallScheduleWithLead[];

  const todayStr = toDateString(now);

  // Date boundaries (UTC)
  const tomorrowStart = new Date(now);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  tomorrowStart.setUTCHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setUTCHours(23, 59, 59, 999);

  const yesterdayStart = new Date(now);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  yesterdayStart.setUTCHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setUTCHours(23, 59, 59, 999);

  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  for (const cs of specificDateCalls) {
    if (!cs.scheduled_date) continue;
    const sd = cs.scheduled_date;
    const sdStr = toDateString(sd);
    const leadName = `${cs.lead.first_name} ${cs.lead.last_name}`;
    const timeStr = formatTime(sd);
    const dateStr = formatDate(sd);

    // ── Trigger 1: Day before ──
    if (sdStr >= toDateString(tomorrowStart) && sdStr <= toDateString(tomorrowEnd)) {
      const created = await createNotification({
        userId: cs.recruiter_user_id,
        type: "call_reminder_day_before",
        title: `Call with ${leadName} tomorrow`,
        message: `You have a scheduled call with ${leadName} tomorrow at ${timeStr}. Prepare your notes and be ready.`,
        callScheduleId: cs.id,
        leadId: cs.lead_id,
        leadName,
        scheduledDate: cs.scheduled_date,
        scheduledMonth: cs.scheduled_month,
      });
      if (created) {
        result.day_before++;
        result.total++;
      }
    }

    // ── Trigger 2: Day of (morning, before call time) ──
    if (sdStr === todayStr && sd > now) {
      const created = await createNotification({
        userId: cs.recruiter_user_id,
        type: "call_reminder_day_of",
        title: `Call with ${leadName} today at ${timeStr}`,
        message: `Your call with ${leadName} is scheduled for today at ${timeStr}. Make sure you're prepared and available.`,
        callScheduleId: cs.id,
        leadId: cs.lead_id,
        leadName,
        scheduledDate: cs.scheduled_date,
        scheduledMonth: cs.scheduled_month,
      });
      if (created) {
        result.day_of++;
        result.total++;
      }
    }

    // ── Trigger 3: 30 minutes after (no call log) ──
    if (sd <= thirtyMinAgo && sdStr === todayStr) {
      const hasLog = await callLogExists(cs.id);
      if (!hasLog) {
        const created = await createNotification({
          userId: cs.recruiter_user_id,
          type: "call_follow_up_30min",
          title: `Missed call with ${leadName}?`,
          message: `Your scheduled call with ${leadName} was at ${timeStr} (30+ min ago) but no call log was recorded. Log the call or reschedule.`,
          callScheduleId: cs.id,
          leadId: cs.lead_id,
          leadName,
          scheduledDate: cs.scheduled_date,
          scheduledMonth: cs.scheduled_month,
        });
        if (created) {
          result.follow_up_30min++;
          result.total++;
        }
      }
    }

    // ── Trigger 4: Day after (no call log) ──
    if (sdStr >= toDateString(yesterdayStart) && sdStr <= toDateString(yesterdayEnd)) {
      const hasLog = await callLogExists(cs.id);
      if (!hasLog) {
        const created = await createNotification({
          userId: cs.recruiter_user_id,
          type: "call_follow_up_day_after",
          title: `Follow up: Call with ${leadName} was yesterday`,
          message: `Your scheduled call with ${leadName} was on ${dateStr} but no call log was recorded. Log the call outcome or reschedule.`,
          callScheduleId: cs.id,
          leadId: cs.lead_id,
          leadName,
          scheduledDate: cs.scheduled_date,
          scheduledMonth: cs.scheduled_month,
        });
        if (created) {
          result.follow_up_day_after++;
          result.total++;
        }
      }
    }
  }

  // ── 2. Month-range call schedules ───────────────────────────────
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed
  const currentDay = now.getUTCDate();
  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const monthRangeCalls = (await db.callSchedule.findMany({
    where: {
      scheduled_date: null,
      scheduled_month: currentMonthStr,
      status: { in: ["scheduled", "rescheduled"] },
    },
    include: {
      lead: {
        select: { id: true, first_name: true, last_name: true },
      },
    },
  })) as CallScheduleWithLead[];

  const lastDay = getLastDayOfMonth(currentYear, currentMonth);

  for (const cs of monthRangeCalls) {
    const leadName = `${cs.lead.first_name} ${cs.lead.last_name}`;
    const monthDisplay = cs.scheduled_month ? formatMonth(cs.scheduled_month) : currentMonthStr;

    // ── Trigger 5: 1st of the month ──
    if (currentDay === 1) {
      const created = await createNotification({
        userId: cs.recruiter_user_id,
        type: "call_month_reminder",
        title: `Call with ${leadName} this month`,
        message: `You have a call scheduled with ${leadName} in ${monthDisplay}. Plan your outreach and set a specific date/time.`,
        callScheduleId: cs.id,
        leadId: cs.lead_id,
        leadName,
        scheduledDate: null,
        scheduledMonth: cs.scheduled_month,
      });
      if (created) {
        result.month_reminder++;
        result.total++;
      }
    }

    // ── Trigger 6: 15th of the month ──
    if (currentDay === 15) {
      const created = await createNotification({
        userId: cs.recruiter_user_id,
        type: "call_month_half_reminder",
        title: `Half month reminder: Call with ${leadName}`,
        message: `We're halfway through ${monthDisplay} and your call with ${leadName} hasn't been scheduled yet. Set a specific date soon.`,
        callScheduleId: cs.id,
        leadId: cs.lead_id,
        leadName,
        scheduledDate: null,
        scheduledMonth: cs.scheduled_month,
      });
      if (created) {
        result.month_half_reminder++;
        result.total++;
      }
    }

    // ── Trigger 7: Last day of the month ──
    if (currentDay === lastDay) {
      const created = await createNotification({
        userId: cs.recruiter_user_id,
        type: "call_month_urgent",
        title: `Urgent: Call with ${leadName} ending soon`,
        message: `Today is the last day of ${monthDisplay}. Your call with ${leadName} must be completed or rescheduled to next month.`,
        callScheduleId: cs.id,
        leadId: cs.lead_id,
        leadName,
        scheduledDate: null,
        scheduledMonth: cs.scheduled_month,
      });
      if (created) {
        result.month_urgent++;
        result.total++;
      }
    }
  }

  return result;
}

// ─── HTTP Handler ───────────────────────────────────────────────────

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const result = await runCallNotificationEngine();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      notifications: result,
    });
  } catch (error) {
    console.error("[CRON_CALL_NOTIFICATIONS]", error);
    return NextResponse.json(
      { error: "Failed to generate call notifications" },
      { status: 500 }
    );
  }
}
