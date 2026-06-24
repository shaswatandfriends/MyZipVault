import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── PATCH: Update an automated rule ────────────────────────────────
// Body: { rule_name?, trigger_condition?, action_type?, template_id?, is_active? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const ruleId = parseInt(id);
    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    const body = await request.json();
    const { rule_name, trigger_condition, action_type, template_id, is_active } = body;

    const updateData: Record<string, unknown> = {};
    if (rule_name !== undefined) updateData.rule_name = rule_name;
    if (trigger_condition !== undefined) {
      updateData.trigger_condition =
        typeof trigger_condition === "string"
          ? trigger_condition
          : JSON.stringify(trigger_condition);
    }
    if (action_type !== undefined) updateData.action_type = action_type;
    if (template_id !== undefined) {
      updateData.template_id = template_id ? Number(template_id) : null;
    }
    if (typeof is_active === "boolean") updateData.is_active = is_active;

    const rule = await db.automatedRule.update({
      where: { id: ruleId },
      data: updateData,
      include: {
        email_template: {
          select: { id: true, template_key: true, subject: true },
        },
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("[AUTOMATED_RULES_PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update automated rule" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove an automated rule ───────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const ruleId = parseInt(id);
    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    // Check for pending reminders linked to this rule
    const pendingCount = await db.pendingReminder.count({
      where: { rule_id: ruleId, status: "awaiting_approval" },
    });

    if (pendingCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${pendingCount} pending reminder(s) are linked to this rule. Resolve them first.`,
        },
        { status: 409 }
      );
    }

    await db.automatedRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AUTOMATED_RULES_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete automated rule" },
      { status: 500 }
    );
  }
}
