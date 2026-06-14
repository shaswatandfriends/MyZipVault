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

    const userId = Number(session.user.id);

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 50,
      }),
      db.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("[CANDIDATE_NOTIFICATIONS_GET]", error);
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
    } else {
      return NextResponse.json(
        { error: "Provide notificationId, notificationIds, or markAllRead" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CANDIDATE_NOTIFICATIONS_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
