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

    const featureFlags = await db.featureFlag.findMany({
      orderBy: { flag_name: "asc" },
    });

    return NextResponse.json({
      featureFlags: featureFlags.map((f) => ({
        id: f.id,
        flagName: f.flag_name,
        isEnabled: f.is_enabled,
        updatedBy: f.updated_by,
        updatedAt: f.updated_at,
      })),
    });
  } catch (error) {
    console.error("Feature Flags GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
    const { flagName, isEnabled } = body;

    if (!flagName || isEnabled === undefined) {
      return NextResponse.json(
        { error: "Flag name and enabled status are required" },
        { status: 400 }
      );
    }

    // Validate Twilio keys before enabling sms_notifications
    if (flagName === "sms_notifications" && isEnabled) {
      const twilioKey = await db.apiKey.findUnique({
        where: { service_name: "twilio" },
      });

      if (!twilioKey || !twilioKey.encrypted_key) {
        return NextResponse.json(
          { error: "Cannot enable SMS notifications: Twilio API keys not configured in the API Vault" },
          { status: 400 }
        );
      }
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

    return NextResponse.json({
      success: true,
      flagName,
      isEnabled,
    });
  } catch (error) {
    console.error("Feature Flags PUT error:", error);
    return NextResponse.json(
      { error: "Failed to toggle feature flag" },
      { status: 500 }
    );
  }
}
