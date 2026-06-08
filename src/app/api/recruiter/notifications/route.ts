import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── Notification type → filter category mapping ─────────────────
const TYPE_CATEGORIES: Record<string, string> = {
  call_scheduled: "calls",
  call_reminder: "calls",
  call_follow_up: "calls",
  call_reminder_day_before: "calls",
  call_reminder_day_of: "calls",
  call_follow_up_30min: "calls",
  call_follow_up_day_after: "calls",
  call_month_reminder: "calls",
  call_month_half_reminder: "calls",
  call_month_urgent: "calls",
  shift_accepted: "shift_requests",
  shift_declined: "shift_requests",
  lead_stage_change: "leads",
  share_request: "leads",
};

// All call-related notification types for filtering
const CALL_NOTIFICATION_TYPES = [
  "call_scheduled",
  "call_reminder",
  "call_follow_up",
  "call_reminder_day_before",
  "call_reminder_day_of",
  "call_follow_up_30min",
  "call_follow_up_day_after",
  "call_month_reminder",
  "call_month_half_reminder",
  "call_month_urgent",
];

// Reminder-specific notification types for the "reminders" filter
const REMINDER_NOTIFICATION_TYPES = [
  "call_reminder",
  "call_follow_up",
  "call_reminder_day_before",
  "call_reminder_day_of",
  "call_follow_up_30min",
  "call_follow_up_day_after",
  "call_month_reminder",
  "call_month_half_reminder",
  "call_month_urgent",
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { user_id: userId };

    // Filter by notification type category
    if (typeFilter !== "all") {
      if (typeFilter === "reminders") {
        where.type = { in: REMINDER_NOTIFICATION_TYPES };
      } else if (typeFilter === "calls") {
        where.type = { in: CALL_NOTIFICATION_TYPES };
      } else if (typeFilter === "leads") {
        where.type = { in: ["lead_stage_change", "share_request"] };
      } else if (typeFilter === "shift_requests") {
        where.type = { in: ["shift_accepted", "shift_declined"] };
      } else if (typeFilter === "call_follow_ups") {
        where.type = { in: ["call_follow_up_30min", "call_follow_up_day_after", "call_follow_up"] };
      } else if (typeFilter === "call_month_reminders") {
        where.type = { in: ["call_month_reminder", "call_month_half_reminder", "call_month_urgent"] };
      }
    }

    // Exclude snoozed notifications that haven't expired yet
    where.OR = [
      { snoozed_until: null },
      { snoozed_until: { lte: new Date() } },
    ];

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: { user_id: userId, is_read: false, OR: [{ snoozed_until: null }, { snoozed_until: { lte: new Date() } }] },
      }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      page,
      limit,
    });
  } catch (error) {
    console.error("[RECRUITER_NOTIFICATIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await request.json();

    if (body.markAllRead) {
      // Mark all notifications as read
      const result = await db.notification.updateMany({
        where: { user_id: userId, is_read: false },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true, count: result.count });
    } else if (body.notificationId) {
      // Mark a single notification as read
      const notification = await db.notification.findFirst({
        where: { id: body.notificationId, user_id: userId },
      });
      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }
      await db.notification.update({
        where: { id: body.notificationId },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true });
    } else if (body.notificationIds && Array.isArray(body.notificationIds)) {
      // Mark specific notifications as read
      await db.notification.updateMany({
        where: {
          user_id: userId,
          id: { in: body.notificationIds },
        },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Provide notificationId, notificationIds, or markAllRead" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[RECRUITER_NOTIFICATIONS_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
