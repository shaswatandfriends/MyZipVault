import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { checkInactiveLeads } from "@/lib/bob/status-engine";

/**
 * GET /api/cron/bob-inactivity
 *
 * Daily cron job that:
 *   1. Finds leads with no activity in 30+ days (status not already inactive)
 *   2. Flips their status → "inactive" (moves them to Company Pool)
 *   3. Logs a "status_changed" activity (auto: inactivity threshold reached)
 *   4. Sends a notification to the owning recruiter
 *
 * Schedule: Daily at 4:00 AM UTC (recommended)
 *   → Set up external cron to hit this endpoint:
 *      curl -H "Authorization: Bearer $CRON_SECRET" \
 *           https://my-zip-vault.vercel.app/api/cron/bob-inactivity
 *
 * Security: Protected by CRON_SECRET (same as all cron endpoints)
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    console.log("[BOB INACTIVITY CRON] Starting daily inactivity check...");

    const startTime = Date.now();
    const result = await checkInactiveLeads();
    const elapsed = Date.now() - startTime;

    console.log(
      `[BOB INACTIVITY CRON] Done in ${elapsed}ms — ` +
      `inactivated: ${result.inactivated}, warned: ${result.warned}`
    );

    return NextResponse.json({
      success: true,
      inactivated: result.inactivated,
      warned: result.warned,
      duration_ms: elapsed,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[BOB INACTIVITY CRON] Error:", error);
    return NextResponse.json(
      { error: error.message || "Inactivity check failed" },
      { status: 500 },
    );
  }
}
