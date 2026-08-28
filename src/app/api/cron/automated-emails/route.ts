import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/cron/automated-emails
 *
 * Runs daily (via external cron service like cron-job.org, or Vercel Cron)
 * to send automated email sequences:
 *
 *   1. Welcome sequence (5 emails: day 0, 1, 3, 7, 14)
 *   2. Profile completion nudges (at 25%, 50%, 75% completion)
 *   3. Re-engagement (30 days inactive)
 *
 * Authentication: requires `x-cron-secret` header matching CRON_SECRET env var.
 *
 * Idempotent: AutomatedEmailLog table has UNIQUE(user_id, sequence, step)
 * so re-running the cron never sends duplicate emails.
 *
 * Expected run frequency: once per day (e.g., 9am UTC).
 */

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXTAUTH_URL || "https://my-zip-vault.vercel.app";

// ─── Welcome sequence definition ────────────────────────────────────
// Each step: days after signup, template key, step name
// NOTE: Day 0 (verification email) is sent immediately by /api/auth/signup
// using the 'email_verification' template. The cron only handles days 1+.
// We pre-seed the day0 log entry so the analytics show it was "sent".
const WELCOME_STEPS = [
  { days: 0, step: "day0", templateKey: "welcome_day0", skipSend: true }, // Already sent by signup
  { days: 1, step: "day1", templateKey: "welcome_day1" },
  { days: 3, step: "day3", templateKey: "welcome_day3" },
  { days: 7, step: "day7", templateKey: "welcome_day7" },
  { days: 14, step: "day14", templateKey: "welcome_day14_reengage" },
];

// Profile completion nudge thresholds
const PROFILE_NUDGES = [
  { pct: 25, step: "nudge_25", templateKey: "profile_nudge_25" },
  { pct: 50, step: "nudge_50", templateKey: "profile_nudge_50" },
  { pct: 75, step: "nudge_75", templateKey: "profile_nudge_75" },
];

// Re-engagement: 30 days inactive
const REENGAGE_DAYS = 30;

export async function POST(request: Request) {
  // ─── Auth check ──────────────────────────────────────────────────
  const authHeader = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    welcome: { sent: 0, skipped: 0, failed: 0 },
    profileNudge: { sent: 0, skipped: 0, failed: 0 },
    reengage: { sent: 0, skipped: 0, failed: 0 },
  };

  const now = new Date();

  try {
    // ════════════════════════════════════════════════════════════════
    // 1. WELCOME SEQUENCE
    // ════════════════════════════════════════════════════════════════
    for (const step of WELCOME_STEPS) {
      // Find users who signed up exactly `step.days` days ago (within a 24h window)
      // to avoid missing users if the cron runs slightly off-schedule.
      const targetDateStart = new Date(now.getTime() - (step.days + 1) * 24 * 60 * 60 * 1000);
      const targetDateEnd = new Date(now.getTime() - step.days * 24 * 60 * 60 * 1000);

      const eligibleUsers = await db.user.findMany({
        where: {
          created_at: {
            gte: targetDateStart,
            lt: targetDateEnd,
          },
          account_status: { notIn: ["suspended", "deleted", "suspended_deleting"] },
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          created_at: true,
          email_verified_at: true,
        },
      });

      for (const user of eligibleUsers) {
        try {
          // Check if already sent (idempotency)
          const alreadySent = await db.automatedEmailLog.findUnique({
            where: {
              user_id_sequence_step: {
                user_id: user.id,
                sequence: "welcome",
                step: step.step,
              },
            },
          }).catch(() => null);

          if (alreadySent) {
            results.welcome.skipped++;
            continue;
          }

          // Day 0 is handled by /api/auth/signup (sends 'email_verification' template).
          // Just log it as sent so analytics are complete.
          if (step.skipSend) {
            await db.automatedEmailLog.create({
              data: {
                user_id: user.id,
                sequence: "welcome",
                step: step.step,
                template_key: step.templateKey,
              },
            }).catch(() => {});
            results.welcome.sent++;
            continue;
          }

          // For days > 0, skip if email not verified yet
          if (step.days > 0 && !user.email_verified_at) {
            results.welcome.skipped++;
            continue;
          }

          // Generate verification link for day0
          const verificationLink = step.days === 0
            ? `${BASE_URL}/verify-email?email=${encodeURIComponent(user.email)}`
            : "";

          // For day1, fetch top jobs
          let topJobsList = "";
          if (step.days === 1) {
            try {
              const topJobs = await db.job.findMany({
                where: { is_closed: false, close_date: { gte: now } },
                take: 10,
                orderBy: { created_at: "desc" },
                select: { title: true, city: true, state: true, salary_display: true },
              });
              topJobsList = topJobs
                .map(
                  (j) =>
                    `<li><strong>${j.title}</strong> — ${j.city || "Remote"}, ${j.state || ""} ${j.salary_display ? `(${j.salary_display})` : ""}</li>`
                )
                .join("");
              if (topJobsList === "") {
                topJobsList = "<li>New jobs are being added daily — check back soon!</li>";
              }
            } catch {
              topJobsList = "<li>Browse all jobs on MyZipVault.</li>";
            }
          }

          // Send the email
          await sendEmail({
            to: user.email,
            templateKey: step.templateKey,
            variables: {
              candidate_name: user.first_name || user.email.split("@")[0],
              verification_link: verificationLink,
              top_jobs_list: topJobsList,
              new_jobs_count: "12",
            },
            bypassPreferences: step.days === 0, // Day 0 is critical (verification)
          });

          // Log the send
          await db.automatedEmailLog.create({
            data: {
              user_id: user.id,
              sequence: "welcome",
              step: step.step,
              template_key: step.templateKey,
            },
          }).catch((err) => {
            // Unique constraint violation = race condition, email already sent
            if (!String(err).includes("unique")) {
              throw err;
            }
          });

          results.welcome.sent++;
        } catch (err) {
          console.error(`[AUTOMATED EMAILS] Welcome ${step.step} failed for user ${user.id}:`, err);
          results.welcome.failed++;
        }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 2. PROFILE COMPLETION NUDGES
    // ════════════════════════════════════════════════════════════════
    // For each nudge threshold, find candidates whose profile completion
    // is at or above the threshold but below the next one, and who haven't
    // received this nudge yet.

    const candidates = await db.user.findMany({
      where: {
        role: "candidate",
        account_status: "active",
        email_verified_at: { not: null },
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        candidate_profile: { select: { profile_completion_pct: true } },
      },
    });

    for (const user of candidates) {
      const pct = user.candidate_profile?.profile_completion_pct ?? 0;

      for (const nudge of PROFILE_NUDGES) {
        // Skip if profile is below this threshold
        if (pct < nudge.pct) continue;
        // Skip if profile is at 100% (no more nudges needed)
        if (pct >= 100) continue;
        // Skip if profile is at or above the NEXT nudge threshold
        // (e.g., if at 60%, don't send the 25% nudge — they're past it)
        const nextNudge = PROFILE_NUDGES.find((n) => n.pct > nudge.pct);
        if (nextNudge && pct >= nextNudge.pct) continue;

        try {
          const alreadySent = await db.automatedEmailLog.findUnique({
            where: {
              user_id_sequence_step: {
                user_id: user.id,
                sequence: "profile_nudge",
                step: nudge.step,
              },
            },
          }).catch(() => null);

          if (alreadySent) {
            results.profileNudge.skipped++;
            continue;
          }

          await sendEmail({
            to: user.email,
            templateKey: nudge.templateKey,
            variables: {
              candidate_name: user.first_name || user.email.split("@")[0],
            },
          });

          await db.automatedEmailLog.create({
            data: {
              user_id: user.id,
              sequence: "profile_nudge",
              step: nudge.step,
              template_key: nudge.templateKey,
            },
          }).catch(() => {});

          results.profileNudge.sent++;
        } catch (err) {
          console.error(`[AUTOMATED EMAILS] Profile nudge ${nudge.step} failed for user ${user.id}:`, err);
          results.profileNudge.failed++;
        }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 3. RE-ENGAGEMENT (30 days inactive)
    // ════════════════════════════════════════════════════════════════
    const inactiveThreshold = new Date(now.getTime() - REENGAGE_DAYS * 24 * 60 * 60 * 1000);

    const inactiveUsers = await db.user.findMany({
      where: {
        account_status: "active",
        email_verified_at: { not: null },
        last_activity_at: { lt: inactiveThreshold },
        // Only re-engage users who signed up more than 30 days ago
        // (don't re-engage brand-new users who just haven't logged in yet)
        created_at: { lt: inactiveThreshold },
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_activity_at: true,
      },
    });

    for (const user of inactiveUsers) {
      try {
        const alreadySent = await db.automatedEmailLog.findUnique({
          where: {
            user_id_sequence_step: {
              user_id: user.id,
              sequence: "reengage",
              step: "30d",
            },
          },
        }).catch(() => null);

        if (alreadySent) {
          results.reengage.skipped++;
          continue;
        }

        // Count new jobs since last activity
        let newJobsCount = 0;
        let newRecruitersCount = 0;
        try {
          newJobsCount = await db.job.count({
            where: { created_at: { gte: user.last_activity_at || inactiveThreshold } },
          });
          newRecruitersCount = await db.user.count({
            where: {
              role: { in: ["client_recruiter", "client_admin"] },
              created_at: { gte: user.last_activity_at || inactiveThreshold },
            },
          });
        } catch {}

        await sendEmail({
          to: user.email,
          templateKey: "reengage_30d",
          variables: {
            candidate_name: user.first_name || user.email.split("@")[0],
            new_jobs_count: String(newJobsCount),
            new_recruiters_count: String(newRecruitersCount),
          },
        });

        await db.automatedEmailLog.create({
          data: {
            user_id: user.id,
            sequence: "reengage",
            step: "30d",
            template_key: "reengage_30d",
          },
        }).catch(() => {});

        results.reengage.sent++;
      } catch (err) {
        console.error(`[AUTOMATED EMAILS] Reengage failed for user ${user.id}:`, err);
        results.reengage.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("[AUTOMATED EMAILS CRON] Fatal error:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: String(error), results },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing in browser
export async function GET(request: Request) {
  return POST(request);
}
