import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/**
 * GET /api/cron/keepalive
 *
 * Lightweight database keep-alive ping.
 *
 * WHY THIS EXISTS:
 *   Supabase free-tier projects auto-pause after 7 days of inactivity.
 *   When paused, the database hostname stops resolving (ENOTFOUND),
 *   and EVERY Prisma query across the app fails:
 *     - Sign-in fails at `platformSetting.findUnique()`
 *     - Candidate dashboard fails to load (9 parallel queries reject)
 *     - Recruiter/admin dashboards fail similarly
 *
 *   This endpoint issues a single trivial Prisma query to keep the
 *   Supabase project "active" in the eyes of their auto-pause policy.
 *
 * SCHEDULE:
 *   - Vercel Cron: runs every 6 hours (see vercel.json)
 *   - GitHub Actions backup: runs daily at 09:00 UTC (see .github/workflows/keepalive.yml)
 *
 * WHAT IT DOES:
 *   1. Runs `db.platformSetting.findUnique({ where: { id: 1 } })` — the
 *      cheapest possible query that touches a real table.
 *   2. Returns latency + timestamp for observability.
 *
 * SECURITY:
 *   Protected by CRON_SECRET (same as all other cron endpoints).
 *   Fail-closed if CRON_SECRET is not set.
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Cheapest possible query — touches platformSetting table (single row, PK lookup)
    // If the table doesn't have id=1, findUnique returns null — that's fine,
    // we only care that the DB connection itself succeeded.
    await db.platformSetting.findUnique({
      where: { id: 1 },
      select: { id: true },
    });

    const latencyMs = Date.now() - startedAt;

    // ─── Trigger automated email sequences (once per day, at 9am UTC) ───
    // Vercel Hobby plan only allows 2 cron jobs, so we piggyback on the
    // keepalive cron (which runs daily at 9am UTC) to also trigger:
    //   1. Automated email sequences (welcome, nudges, re-engagement)
    //   2. Status updates (expire checklist requests, send reminders)
    //   3. Profile completion recalculation
    // All endpoints are idempotent — safe to call multiple times.
    try {
      const cronSecret = process.env.CRON_SECRET;
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || `https://${request.headers.get("host") || "my-zip-vault.vercel.app"}`;
      if (cronSecret && baseUrl) {
        // Trigger all 3 cron jobs fire-and-forget
        const endpoints = ["/api/cron/automated-emails", "/api/cron/status-update", "/api/cron/profile-recalc"];
        for (const ep of endpoints) {
          fetch(`${baseUrl}${ep}`, {
            method: "POST",
            headers: { "x-cron-secret": cronSecret },
          }).catch((err) => {
            console.error(`[CRON_KEEPALIVE] Failed to trigger ${ep}:`, err);
          });
        }
      }
    } catch (err) {
      console.error("[CRON_KEEPALIVE] Error triggering cron jobs:", err);
    }

    return NextResponse.json({
      success: true,
      ok: true,
      latencyMs,
      timestamp,
      message: "Supabase keep-alive ping succeeded",
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    console.error("[CRON_KEEPALIVE] Supabase ping failed:", error);

    // Return 200 even on DB error — we don't want Vercel Cron to disable
    // the schedule due to "failures" (it does that after consecutive 5xx).
    // The error is logged server-side for observability.
    return NextResponse.json({
      success: false,
      ok: false,
      latencyMs,
      timestamp,
      error: error instanceof Error ? error.message : "Unknown DB error",
      message: "Keep-alive ping failed — Supabase may be paused or unreachable",
    });
  }
}
