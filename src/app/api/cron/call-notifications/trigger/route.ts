import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runCallNotificationEngine } from "@/app/api/cron/call-notifications/route";

export async function POST(request: Request) {
  try {
    // Superadmin-only — no CRON_SECRET check needed
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden — superadmin only" },
        { status: 403 }
      );
    }

    const result = await runCallNotificationEngine();

    return NextResponse.json({
      success: true,
      triggeredBy: "manual",
      triggeredByUser: session.user.email,
      timestamp: new Date().toISOString(),
      notifications: result,
    });
  } catch (error) {
    console.error("[CRON_CALL_NOTIFICATIONS_TRIGGER]", error);
    return NextResponse.json(
      { error: "Failed to trigger call notifications" },
      { status: 500 }
    );
  }
}
