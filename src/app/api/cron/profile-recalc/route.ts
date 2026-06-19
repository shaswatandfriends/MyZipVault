import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { recalcAllProfileCompletions } from "@/lib/profile-completion";

/**
 * GET /api/cron/profile-recalc
 *
 * Daily cron job that recalculates profile completion percentages for
 * ALL candidates.
 *
 * Per Gap 17 fix: ensures stale percentages get corrected. Triggers for
 * recalculation include:
 *   - Credentials that expired (verification_status may have changed)
 *   - Credentials that were deleted
 *   - References that were deleted or expired
 *   - Checklist responses that expired (valid_until < now)
 *   - Resume that was deleted
 *
 * Schedule: Daily at 3:00 AM UTC (recommended)
 *
 * Security: Protected by CRON_SECRET (same as all cron endpoints)
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    console.log("[CRON_PROFILE_RECALC] Starting daily profile recalculation...");

    const startTime = Date.now();
    const result = await recalcAllProfileCompletions();
    const durationMs = Date.now() - startTime;

    console.log(
      `[CRON_PROFILE_RECALC] Complete — processed: ${result.processed}, updated: ${result.updated}, duration: ${durationMs}ms`
    );

    return NextResponse.json({
      success: true,
      processed: result.processed,
      updated: result.updated,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON_PROFILE_RECALC] Error:", error);
    return NextResponse.json(
      { error: "Failed to recalculate profile completions" },
      { status: 500 }
    );
  }
}
