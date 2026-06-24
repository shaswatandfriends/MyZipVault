import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── GET: List all automated rules ──────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rules = await db.automatedRule.findMany({
      include: {
        email_template: {
          select: { id: true, template_key: true, subject: true },
        },
        _count: {
          select: { pending_reminders: true },
        },
      },
      orderBy: { rule_name: "asc" },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("[AUTOMATED_RULES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch automated rules" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new automated rule ──────────────────────────────
// Body: { rule_name, trigger_condition, action_type, template_id?, is_active? }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rule_name, trigger_condition, action_type, template_id, is_active } = body;

    if (!rule_name || !trigger_condition || !action_type) {
      return NextResponse.json(
        { error: "rule_name, trigger_condition, and action_type are required" },
        { status: 400 }
      );
    }

    // Validate template_id if provided
    if (template_id) {
      const template = await db.emailTemplate.findUnique({
        where: { id: Number(template_id) },
      });
      if (!template) {
        return NextResponse.json(
          { error: "Email template not found" },
          { status: 404 }
        );
      }
    }

    const rule = await db.automatedRule.create({
      data: {
        rule_name,
        trigger_condition:
          typeof trigger_condition === "string"
            ? trigger_condition
            : JSON.stringify(trigger_condition),
        action_type,
        template_id: template_id ? Number(template_id) : null,
        is_active: is_active ?? true,
      },
      include: {
        email_template: {
          select: { id: true, template_key: true, subject: true },
        },
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("[AUTOMATED_RULES_POST]", error);
    return NextResponse.json(
      { error: "Failed to create automated rule" },
      { status: 500 }
    );
  }
}
