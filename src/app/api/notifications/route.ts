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

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = { user_id: userId };
    if (type) where.type = type;
    if (unreadOnly) where.is_read = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
    });

    // Parse action_data JSON for each notification
    const parsed = notifications.map((n) => ({
      ...n,
      action_data: n.action_data ? JSON.parse(n.action_data) : null,
    }));

    return NextResponse.json({ notifications: parsed });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
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
      await db.notification.updateMany({
        where: { user_id: userId, is_read: false },
        data: { is_read: true },
      });
    } else if (body.notificationIds && Array.isArray(body.notificationIds)) {
      await db.notification.updateMany({
        where: { user_id: userId, id: { in: body.notificationIds } },
        data: { is_read: true },
      });
    } else if (body.notificationId && body.actionTaken) {
      // Mark action as taken on a notification
      await db.notification.update({
        where: { id: body.notificationId, user_id: userId },
        data: { action_taken: true, action_taken_at: new Date(), is_read: true },
      });
    } else if (body.notificationId && body.snoozeUntil) {
      // Snooze a notification's related reminder
      const notification = await db.notification.findUnique({
        where: { id: body.notificationId, user_id: userId },
      });
      if (notification?.action_data) {
        const actionData = JSON.parse(notification.action_data);
        if (actionData.reminder_id) {
          await db.followUpReminder.update({
            where: { id: actionData.reminder_id },
            data: { status: "snoozed", snoozed_until: new Date(body.snoozeUntil) },
          });
        }
      }
      await db.notification.update({
        where: { id: body.notificationId },
        data: { is_read: true },
      });
    } else {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_PUT]", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
