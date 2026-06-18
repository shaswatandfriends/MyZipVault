import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function POST(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all pending_reminders with status = "awaiting_approval" where created_at < today
    const result = await db.pendingReminder.updateMany({
      where: {
        status: "awaiting_approval",
        created_at: { lt: today },
      },
      data: {
        status: "skipped",
      },
    });

    return NextResponse.json({ skipped: result.count });
  } catch (error) {
    console.error("[CRON_REMINDERS_SKIP]", error);
    return NextResponse.json(
      { error: "Failed to skip reminders" },
      { status: 500 }
    );
  }
}
