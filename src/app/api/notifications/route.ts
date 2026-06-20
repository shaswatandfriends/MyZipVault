import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/notifications
 *
 * Unified notifications API for ALL roles.
 * Returns paginated notifications with filters.
 *
 * Query params:
 *   - filter: "all" | "unread" | "urgent" (default: all)
 *   - category: "rtr" | "document" | "status" | "calendar" | "credit" | "compliance" | "system"
 *   - limit: max results (default: 50, max: 200)
 *   - offset: pagination offset (default: 0)
 *
 * Returns:
 *   - notifications: Notification[]
 *   - unreadCount: number
 *   - totalCount: number
 *   - categories: array of categories with unread counts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") ?? "all";
    const categoryFilter = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50") || 50, 200);
    const offset = parseInt(searchParams.get("offset") ?? "0") || 0;

    // Build where clause
    const where: any = { user_id: userId };

    if (filter === "unread") {
      where.is_read = false;
    } else if (filter === "urgent") {
      where.is_read = false;
      where.priority = "urgent";
    }

    if (categoryFilter && categoryFilter !== "all") {
      where.category = categoryFilter;
    }

    // Fetch notifications + counts in parallel
    const [notifications, unreadCount, totalCount, categoryCounts] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
      }),
      db.notification.count({
        where: { user_id: userId, is_read: false },
      }),
      db.notification.count({ where }),
      db.notification.groupBy({
        by: ["category"],
        where: { user_id: userId, is_read: false },
        _count: { id: true },
      }),
    ]);

    // Format category counts
    const categories: Record<string, number> = {};
    for (const row of categoryCounts) {
      categories[row.category] = row._count?.id ?? 0;
    }

    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount,
      categories,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications
 *
 * Mark notifications as read.
 * Body:
 *   - markAllRead: boolean — mark ALL as read
 *   - notificationIds: number[] — mark specific ones as read
 *   - markAsUnread: boolean — mark as unread instead (default: false)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const body = await request.json();
    const { markAllRead, notificationIds, markAsUnread } = body;

    const isRead = !markAsUnread;

    if (markAllRead) {
      await db.notification.updateMany({
        where: { user_id: userId, is_read: !isRead },
        data: { is_read: isRead },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          user_id: userId,
        },
        data: { is_read: isRead },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[NOTIFICATIONS PUT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notifications" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications?id={id}
 *
 * Delete a single notification.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") ?? "");

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    // Delete the notification (only if it belongs to this user)
    await db.notification.deleteMany({
      where: { id, user_id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[NOTIFICATIONS DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete notification" },
      { status: 500 },
    );
  }
}
