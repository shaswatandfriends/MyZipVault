import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/notification-defaults
 * Returns all notification category defaults.
 *
 * PUT /api/superadmin/notification-defaults
 * Updates a specific category's email/in_app/sms toggle.
 * Body: { category: "rtr", email_enabled: true }
 *
 * Access: super_admin only
 */

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

    const defaults = await db.notificationDefault.findMany({
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ defaults });
  } catch (error: any) {
    console.error("[NOTIFICATION_DEFAULTS GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch defaults" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { category, email_enabled, in_app_enabled, sms_enabled } = body;

    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const updateData: any = { updated_at: new Date() };
    if (email_enabled !== undefined) updateData.email_enabled = email_enabled;
    if (in_app_enabled !== undefined) updateData.in_app_enabled = in_app_enabled;
    if (sms_enabled !== undefined) updateData.sms_enabled = sms_enabled;

    const updated = await db.notificationDefault.update({
      where: { category },
      data: updateData,
    });

    return NextResponse.json({ success: true, default: updated });
  } catch (error: any) {
    console.error("[NOTIFICATION_DEFAULTS PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update default" }, { status: 500 });
  }
}
