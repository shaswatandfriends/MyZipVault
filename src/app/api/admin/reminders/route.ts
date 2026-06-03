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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get pending reminders
    const reminders = await db.pendingReminder.findMany({
      where: { status: "awaiting_approval" },
      select: {
        id: true,
        rule_id: true,
        target_user_id: true,
        message_preview: true,
        status: true,
        created_at: true,
        rule: {
          select: { id: true, rule_name: true, action_type: true },
        },
        target_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [awaitingApproval, approvedToday, skippedToday] = await Promise.all([
      db.pendingReminder.count({ where: { status: "awaiting_approval" } }),
      db.pendingReminder.count({
        where: { status: "approved", actioned_at: { gte: today } },
      }),
      db.pendingReminder.count({
        where: { status: "skipped", actioned_at: { gte: today } },
      }),
    ]);

    return NextResponse.json({
      reminders: reminders.map((r) => ({
        id: r.id,
        ruleId: r.rule_id,
        targetUserId: r.target_user_id,
        messagePreview: r.message_preview,
        status: r.status,
        createdAt: r.created_at,
        rule: {
          id: r.rule.id,
          ruleName: r.rule.rule_name,
          actionType: r.rule.action_type,
        },
        targetUser: {
          id: r.target_user.id,
          firstName: r.target_user.first_name,
          lastName: r.target_user.last_name,
          email: r.target_user.email,
        },
      })),
      stats: {
        awaitingApproval,
        approvedToday,
        skippedToday,
      },
    });
  } catch (error) {
    console.error("Admin Reminders GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminUserId = Number(session.user.id);
    const body = await request.json();
    const { action, reminderIds } = body;

    if (!action || !reminderIds) {
      return NextResponse.json(
        { error: "Action and reminderIds are required" },
        { status: 400 }
      );
    }

    const ids = Array.isArray(reminderIds) ? reminderIds : [reminderIds];

    switch (action) {
      case "approve": {
        await db.pendingReminder.updateMany({
          where: { id: { in: ids }, status: "awaiting_approval" },
          data: {
            status: "approved",
            actioned_by: adminUserId,
            actioned_at: new Date(),
          },
        });
        return NextResponse.json({
          success: true,
          message: `${ids.length} reminder(s) approved`,
        });
      }
      case "skip": {
        await db.pendingReminder.updateMany({
          where: { id: { in: ids }, status: "awaiting_approval" },
          data: {
            status: "skipped",
            actioned_by: adminUserId,
            actioned_at: new Date(),
          },
        });
        return NextResponse.json({
          success: true,
          message: `${ids.length} reminder(s) skipped`,
        });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin Reminders POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
