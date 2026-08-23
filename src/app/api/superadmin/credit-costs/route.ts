import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateCreditCostCache } from "@/lib/credit-gating";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/superadmin/credit-costs
 *   Returns all credit_cost.* entries from PlatformSetting.
 *
 * PUT /api/superadmin/credit-costs
 *   Bulk update credit costs. Body: { costs: { feature_name: number, ... } }
 *   Updates each in PlatformSetting, then invalidates the cache.
 */

// Human-readable labels for each credit cost feature
const CREDIT_COST_LABELS: Record<string, string> = {
  unlock_candidate: "Unlock Candidate Profile",
  view_credentials: "View Credentials",
  view_references: "View References",
  view_resume: "View Resume",
  send_share_request: "Send Share Request",
  view_full_packet: "View Full Packet (all docs)",
  reveal_email: "Reveal Candidate Email",
  reveal_phone: "Reveal Candidate Phone",
  submit_candidate: "Submit Candidate to Job",
  send_skill_checklist: "Send Skill Checklist",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin" && role !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await db.platformSetting.findMany({
      where: { setting_key: { startsWith: "credit_cost." } },
      select: { setting_key: true, setting_value: true, updated_at: true },
    });

    const costs = settings.map((s) => {
      const featureName = s.setting_key.replace("credit_cost.", "");
      return {
        feature: featureName,
        label: CREDIT_COST_LABELS[featureName] ?? featureName,
        cost: parseInt(s.setting_value, 10),
        updated_at: s.updated_at,
      };
    });

    return NextResponse.json({ costs });
  } catch (error) {
    console.error("[CREDIT_COSTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch credit costs" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const body = await request.json();
    const { costs } = body as { costs: Record<string, number> };

    if (!costs || typeof costs !== "object") {
      return NextResponse.json({ error: "costs object is required" }, { status: 400 });
    }

    // Validate each cost (must be a non-negative integer)
    for (const [feature, cost] of Object.entries(costs)) {
      if (typeof cost !== "number" || cost < 0 || !Number.isInteger(cost)) {
        return NextResponse.json({ error: `Invalid cost for ${feature}: must be a non-negative integer` }, { status: 400 });
      }
      if (cost > 1000) {
        return NextResponse.json({ error: `Cost for ${feature} is too high (max 1000)` }, { status: 400 });
      }
    }

    // Update each cost in PlatformSetting
    const updates: string[] = [];
    for (const [feature, cost] of Object.entries(costs)) {
      await db.platformSetting.upsert({
        where: { setting_key: `credit_cost.${feature}` },
        update: {
          setting_value: String(cost),
          updated_by: adminId,
          updated_at: new Date(),
        },
        create: {
          setting_key: `credit_cost.${feature}`,
          setting_value: String(cost),
          updated_by: adminId,
        },
      });
      updates.push(`${feature}=${cost}`);
    }

    // Invalidate the in-memory cache so new costs take effect immediately
    invalidateCreditCostCache();

    // Audit log
    try {
      await logAudit({
        userId: adminId,
        role,
        action: "credit_costs_updated",
        entityType: "platform_setting",
        entityId: 0,
        details: `Updated credit costs: ${updates.join(", ")}`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log credit cost update:", auditErr);
    }

    return NextResponse.json({ success: true, updated: updates.length, costs });
  } catch (error) {
    console.error("[CREDIT_COSTS_PUT]", error);
    return NextResponse.json({ error: "Failed to update credit costs" }, { status: 500 });
  }
}
