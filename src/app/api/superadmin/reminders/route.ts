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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ruleTypeFilter = searchParams.get("ruleType") || "all";

    // Super admin sees ALL pending reminders
    const where: Record<string, unknown> = {
      status: "awaiting_approval",
    };

    if (ruleTypeFilter !== "all") {
      // Filter by rule's trigger_condition
      const rules = await db.automatedRule.findMany({
        where: { trigger_condition: { contains: ruleTypeFilter } },
        select: { id: true },
      });
      where.rule_id = { in: rules.map((r) => r.id) };
    }

    const reminders = await db.pendingReminder.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        target_user: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
        rule: {
          select: { id: true, rule_name: true, trigger_condition: true, action_type: true },
        },
        actioner: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    // Stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [awaitingCount, approvedToday, skippedToday] = await Promise.all([
      db.pendingReminder.count({ where: { status: "awaiting_approval" } }),
      db.pendingReminder.count({
        where: { status: "approved", actioned_at: { gte: todayStart } },
      }),
      db.pendingReminder.count({
        where: { status: "skipped", actioned_at: { gte: todayStart } },
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
        actionedBy: r.actioned_by,
        actionedAt: r.actioned_at,
        targetUser: {
          id: r.target_user.id,
          firstName: r.target_user.first_name,
          lastName: r.target_user.last_name,
          email: r.target_user.email,
          role: r.target_user.role,
        },
        rule: {
          id: r.rule.id,
          ruleName: r.rule.rule_name,
          triggerCondition: r.rule.trigger_condition,
          actionType: r.rule.action_type,
        },
        actioner: r.actioner
          ? { id: r.actioner.id, firstName: r.actioner.first_name, lastName: r.actioner.last_name }
          : null,
      })),
      stats: { awaitingCount, approvedToday, skippedToday },
    });
  } catch (error) {
    console.error("Superadmin Reminders GET error:", error);
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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "approve": {
        const { reminderId } = body;
        if (!reminderId) {
          return NextResponse.json({ error: "Reminder ID is required" }, { status: 400 });
        }

        await db.pendingReminder.update({
          where: { id: reminderId },
          data: {
            status: "approved",
            actioned_by: actionerId,
            actioned_at: new Date(),
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "approve_reminder",
            entity_type: "pending_reminder",
            entity_id: reminderId,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "skip": {
        const { reminderId } = body;
        if (!reminderId) {
          return NextResponse.json({ error: "Reminder ID is required" }, { status: 400 });
        }

        await db.pendingReminder.update({
          where: { id: reminderId },
          data: {
            status: "skipped",
            actioned_by: actionerId,
            actioned_at: new Date(),
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "skip_reminder",
            entity_type: "pending_reminder",
            entity_id: reminderId,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "approve_all": {
        const pending = await db.pendingReminder.findMany({
          where: { status: "awaiting_approval" },
          select: { id: true },
        });

        if (pending.length === 0) {
          return NextResponse.json({ success: true, count: 0 });
        }

        await db.pendingReminder.updateMany({
          where: { status: "awaiting_approval" },
          data: {
            status: "approved",
            actioned_by: actionerId,
            actioned_at: new Date(),
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "approve_all_reminders",
            entity_type: "pending_reminder",
            entity_id: null,
          },
        });

        return NextResponse.json({ success: true, count: pending.length });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Reminders POST error:", error);
    return NextResponse.json(
      { error: "Failed to process reminder action" },
      { status: 500 }
    );
  }
}
