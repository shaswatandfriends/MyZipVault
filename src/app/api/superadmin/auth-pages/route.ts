import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  AUTH_PAGE_CONFIG_KEY,
  DEFAULT_AUTH_PAGE_CONFIG,
  mergeWithDefaults,
} from "@/lib/auth-page-config";
import type { AuthPageConfig } from "@/lib/auth-page-config";

export const dynamic = "force-dynamic";

// ─── GET /api/superadmin/auth-pages ───────────────────────────────────
// Returns current auth page config (merged with defaults) for the editor.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const row = await db.platformSetting.findUnique({
      where: { setting_key: AUTH_PAGE_CONFIG_KEY },
    });

    if (!row) {
      return NextResponse.json(DEFAULT_AUTH_PAGE_CONFIG);
    }

    const dbConfig = JSON.parse(row.setting_value) as Partial<AuthPageConfig>;
    const merged = mergeWithDefaults(dbConfig);
    return NextResponse.json(merged);
  } catch (error) {
    console.error("Superadmin Auth Pages GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch auth page config" },
      { status: 500 }
    );
  }
}

// ─── POST /api/superadmin/auth-pages ──────────────────────────────────
// Saves the full auth page config. Body: { config: AuthPageConfig }
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

    const actionerId = parseInt(session.user.id as string, 10);
    const body = await request.json();
    const { config } = body as { config: AuthPageConfig };

    if (!config) {
      return NextResponse.json(
        { error: "Config object is required" },
        { status: 400 }
      );
    }

    // Upsert the config as a JSON string in PlatformSetting
    await db.platformSetting.upsert({
      where: { setting_key: AUTH_PAGE_CONFIG_KEY },
      create: {
        setting_key: AUTH_PAGE_CONFIG_KEY,
        setting_value: JSON.stringify(config),
        updated_by: actionerId,
      },
      update: {
        setting_value: JSON.stringify(config),
        updated_by: actionerId,
        updated_at: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: "super_admin",
        action: "update_auth_page_config",
        entity_type: "platform_setting",
        entity_id: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Superadmin Auth Pages POST error:", error);
    return NextResponse.json(
      { error: "Failed to save auth page config" },
      { status: 500 }
    );
  }
}
