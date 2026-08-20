import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { checkInactiveLeads, checkAssignmentStarts } from "@/lib/bob/status-engine";

/**
 * GET /api/cron/bob-inactivity
 *
 * Daily cron job that runs TWO checks:
 *
 * 1. ASSIGNMENT START CHECK
 *    Finds leads in 'onboarding' status whose contract_start_date has
 *    arrived (today or past). Auto-flips them to 'on_assignment'.
 *
 * 2. INACTIVITY CHECK
 *    - Sends 5/3/1-day warning notifications before inactivity
 *    - Flips leads with 30+ days no activity to 'inactive' (Company Pool)
 *    - Notifies the owning recruiter
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
    console.log("[BOB CRON] Starting daily checks...");
    const startTime = Date.now();

    // 1. Check assignment starts
    const assignmentResult = await checkAssignmentStarts();
    console.log(`[BOB CRON] Assignment starts: ${assignmentResult.started} lead(s) flipped to On Assignment`);

    // 2. Check inactivity
    const inactivityResult = await checkInactiveLeads();
    console.log(
      `[BOB CRON] Inactivity: warned=${inactivityResult.warned}, inactivated=${inactivityResult.inactivated}`
    );

    const elapsed = Date.now() - startTime;
    console.log(`[BOB CRON] Done in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      assignment_started: assignmentResult.started,
      inactivated: inactivityResult.inactivated,
      warned: inactivityResult.warned,
      duration_ms: elapsed,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[BOB CRON] Error:", error);
    return NextResponse.json(
      { error: error.message || "BOB cron check failed" },
      { status: 500 },
    );
  }
}
