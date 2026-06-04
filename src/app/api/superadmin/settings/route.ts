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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [settings, featureFlags] = await Promise.all([
      db.platformSetting.findMany({
        orderBy: { setting_key: "asc" },
      }),
      db.featureFlag.findMany({
        orderBy: { flag_name: "asc" },
      }),
    ]);

    return NextResponse.json({
      settings: settings.map((s) => ({
        id: s.id,
        settingKey: s.setting_key,
        settingValue: s.setting_value,
        updatedBy: s.updated_by,
        updatedAt: s.updated_at,
      })),
      featureFlags: featureFlags.map((f) => ({
        id: f.id,
        flagName: f.flag_name,
        isEnabled: f.is_enabled,
        updatedBy: f.updated_by,
        updatedAt: f.updated_at,
      })),
    });
  } catch (error) {
    console.error("Superadmin Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
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

    const actionerId = parseInt(session.user.id as string, 10);
    const body = await request.json();
    const { type } = body;

    switch (type) {
      case "update-setting": {
        const { settingKey, settingValue } = body;
        if (!settingKey || settingValue === undefined) {
          return NextResponse.json(
            { error: "Setting key and value are required" },
            { status: 400 }
          );
        }

        await db.platformSetting.upsert({
          where: { setting_key: settingKey },
          create: {
            setting_key: settingKey,
            setting_value: String(settingValue),
            updated_by: actionerId,
          },
          update: {
            setting_value: String(settingValue),
            updated_by: actionerId,
            updated_at: new Date(),
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "update_setting",
            entity_type: "platform_setting",
            entity_id: null,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "toggle-feature-flag": {
        const { flagName, isEnabled } = body;
        if (!flagName || isEnabled === undefined) {
          return NextResponse.json(
            { error: "Flag name and enabled status are required" },
            { status: 400 }
          );
        }

        await db.featureFlag.upsert({
          where: { flag_name: flagName },
          create: {
            flag_name: flagName,
            is_enabled: isEnabled,
            updated_by: actionerId,
          },
          update: {
            is_enabled: isEnabled,
            updated_by: actionerId,
            updated_at: new Date(),
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "toggle_feature_flag",
            entity_type: "feature_flag",
            entity_id: null,
          },
        });

        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Settings POST error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
