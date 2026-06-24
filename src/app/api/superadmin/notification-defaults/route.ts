import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── Categories ─────────────────────────────────────────────────────
const CATEGORIES = [
  "rtr",
  "document",
  "status",
  "calendar",
  "credit",
  "compliance",
  "system",
] as const;

// ─── GET: List all notification defaults ────────────────────────────
// Returns all NotificationDefault rows. If any category is missing from
// the DB, it's seeded with defaults (email=true, in_app=true, sms=false).
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

    // Seed any missing categories
    const existing = await db.notificationDefault.findMany();
    const existingCategories = new Set(existing.map((d) => d.category));
    const missing = CATEGORIES.filter((c) => !existingCategories.has(c));

    if (missing.length > 0) {
      await db.notificationDefault.createMany({
        data: missing.map((category) => ({
          category,
          email_enabled: true,
          in_app_enabled: true,
          sms_enabled: false,
        })),
      });
    }

    const defaults = await db.notificationDefault.findMany({
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ defaults });
  } catch (error) {
    console.error("[NOTIFICATION_DEFAULTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch notification defaults" },
      { status: 500 }
    );
  }
}

// ─── PUT: Update a single category's toggles ────────────────────────
// Body: { category: string, email_enabled?: boolean, in_app_enabled?: boolean, sms_enabled?: boolean }
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

    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Build update data — only include fields that are provided
    const updateData: Record<string, boolean> = {};
    if (typeof email_enabled === "boolean") updateData.email_enabled = email_enabled;
    if (typeof in_app_enabled === "boolean") updateData.in_app_enabled = in_app_enabled;
    if (typeof sms_enabled === "boolean") updateData.sms_enabled = sms_enabled;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided to update" },
        { status: 400 }
      );
    }

    // Upsert — create the row if it doesn't exist (defensive)
    const updated = await db.notificationDefault.upsert({
      where: { category },
      create: {
        category,
        email_enabled: email_enabled ?? true,
        in_app_enabled: in_app_enabled ?? true,
        sms_enabled: sms_enabled ?? false,
      },
      update: updateData,
    });

    return NextResponse.json({ success: true, default: updated });
  } catch (error) {
    console.error("[NOTIFICATION_DEFAULTS_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update notification defaults" },
      { status: 500 }
    );
  }
}
