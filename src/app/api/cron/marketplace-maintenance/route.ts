import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/**
 * GET /api/cron/marketplace-maintenance
 *
 * Consolidated marketplace maintenance job. Runs 3 tasks in sequence:
 *
 *   1. OWNERSHIP WINDOW REFRESH
 *      For each active CandidateOwnershipWindow:
 *        - If now > residual_window_end → set current_phase='expired',
 *          is_active=false
 *        - Else if now > exclusive_window_end → set current_phase='residual'
 *        - Else → keep current_phase='exclusive'
 *      Also auto-expires CandidateContactReveal records where
 *      expires_at < now → set is_expired=true.
 *
 *   2. REPUTATION SCORE RECALCULATION
 *      For each recruiter with at least 1 review:
 *        - Calculate aggregate scores per dimension (avg of all active
 *          reviews for that dimension)
 *        - Calculate overall_score = weighted average
 *        - Update total_placements, avg_time_to_fill_days,
 *          candidate_retention_pct, avg_response_hours
 *        - Update badge_tier:
 *          - 'verified' if 25+ reviews with 7.0+ overall_score
 *          - 'top' if 50+ reviews with 8.5+ overall_score
 *        - For recruiters with 0 reviews: leave at defaults (0.0)
 *
 *   3. AUTO-VIOLATION CHECK
 *      Check for recruiters with upheld reports in time windows:
 *        - 3+ upheld reports in last 30 days → suspend 30 days
 *        - 5+ upheld reports in last 90 days → suspend 90 days
 *        - Any upheld 'rtr_violation' report → suspend 14 days
 *      Auto-suspension = set account_status='suspended' on the User.
 *      Audit logged for each auto-action.
 *
 * Schedule: Daily at 03:00 UTC (see vercel.json)
 * Auth: CRON_SECRET (via verifyCronAuth)
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startedAt = Date.now();
  const now = new Date();
  const result = {
    started_at: now.toISOString(),
    ownership_windows: { processed: 0, expired: 0, moved_to_residual: 0, errors: 0 },
    reveals_expired: 0,
    reputation_scores: { processed: 0, updated: 0, new_badges: { verified: 0, top: 0 }, errors: 0 },
    violation_check: { recruiters_checked: 0, auto_suspensions: 0, errors: 0, details: [] as string[] },
  };

  // ─────────────────────────────────────────────────────────────────────
  // TASK 1: OWNERSHIP WINDOW REFRESH
  // ─────────────────────────────────────────────────────────────────────
  try {
    // 1a. Move 'exclusive' → 'residual' where exclusive_window_end < now
    const exclusiveToResidual = await db.candidateOwnershipWindow.updateMany({
      where: {
        is_active: true,
        current_phase: "exclusive",
        exclusive_window_end: { lt: now },
        residual_window_end: { gte: now },
      },
      data: {
        current_phase: "residual",
        phase_computed_at: now,
      },
    });
    result.ownership_windows.moved_to_residual = exclusiveToResidual.count;

    // 1b. Move 'residual' → 'expired' where residual_window_end < now
    const residualToExpired = await db.candidateOwnershipWindow.updateMany({
      where: {
        is_active: true,
        current_phase: "residual",
        residual_window_end: { lt: now },
      },
      data: {
        current_phase: "expired",
        is_active: false,
        phase_computed_at: now,
      },
    });
    result.ownership_windows.expired = residualToExpired.count;

    result.ownership_windows.processed = exclusiveToResidual.count + residualToExpired.count;
  } catch (err) {
    console.error("[CRON_MARKETPLACE] Task 1 (ownership refresh) failed:", err);
    result.ownership_windows.errors = 1;
  }

  // 1c. Auto-expire contact reveals where expires_at < now
  try {
    const expiredReveals = await db.candidateContactReveal.updateMany({
      where: {
        is_expired: false,
        expires_at: { lt: now },
      },
      data: { is_expired: true },
    });
    result.reveals_expired = expiredReveals.count;
  } catch (err) {
    console.error("[CRON_MARKETPLACE] Task 1c (reveal expiry) failed:", err);
  }

  // ─────────────────────────────────────────────────────────────────────
  // TASK 2: REPUTATION SCORE RECALCULATION
  // ─────────────────────────────────────────────────────────────────────
  try {
    // Get all distinct recruiter_user_ids from RecruiterReview (active status only)
    const reviewedRecruiters = await db.recruiterReview.groupBy({
      by: ["recruiter_user_id"],
      where: { status: "active" },
      _count: { _all: true },
    });

    for (const entry of reviewedRecruiters) {
      try {
        const recruiterUserId = entry.recruiter_user_id;
        const totalReviews = entry._count._all;

        // Get all active reviews for this recruiter
        const reviews = await db.recruiterReview.findMany({
          where: { recruiter_user_id: recruiterUserId, status: "active" },
          select: {
            professionalism: true,
            communication: true,
            job_match: true,
            process_speed: true,
            post_placement: true,
            is_verified_placement: true,
            is_anonymous: true,
          },
        });

        // Calculate averages
        const verifiedReviews = reviews.filter((r) => r.is_verified_placement);
        const verifiedCount = verifiedReviews.length;

        const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((s, x) => s + x, 0) / arr.length;

        const professionalism_avg = avg(reviews.map((r) => r.professionalism));
        const communication_avg = avg(reviews.map((r) => r.communication));
        const job_match_avg = avg(reviews.map((r) => r.job_match));
        const process_speed_avg = avg(reviews.map((r) => r.process_speed));
        const post_placement_avg = avg(reviews.map((r) => r.post_placement));

        // Weighted overall score:
        //   professionalism 25%, job_match 25%, communication 20%,
        //   process_speed 15%, post_placement 15%
        const overall_score =
          professionalism_avg * 0.25 +
          communication_avg * 0.20 +
          job_match_avg * 0.25 +
          process_speed_avg * 0.15 +
          post_placement_avg * 0.15;

        // Boost: +0.5 if 25+ verified reviews
        const boostVerified = verifiedCount >= 25 ? 0.5 : 0;
        // Boost: +0.3 if named (non-anonymous) reviews dominate
        const namedReviews = reviews.filter((r) => !r.is_anonymous).length;
        const boostNamed = namedReviews > reviews.length / 2 && reviews.length > 0 ? 0.3 : 0;
        const finalOverall = Math.min(10, overall_score + boostVerified + boostNamed);

        // Determine badge tier
        let badge_tier = "none";
        if (totalReviews >= 50 && finalOverall >= 8.5) {
          badge_tier = "top";
          result.reputation_scores.new_badges.top++;
        } else if (totalReviews >= 25 && finalOverall >= 7.0) {
          badge_tier = "verified";
          result.reputation_scores.new_badges.verified++;
        }

        // Get other signals
        const totalPlacements = await db.candidateSubmission.count({
          where: { recruiter_user_id: recruiterUserId, status: "placed" },
        });

        // avg_time_to_fill_days: avg days between submitted_at and placed_at
        const placedSubs = await db.candidateSubmission.findMany({
          where: { recruiter_user_id: recruiterUserId, status: "placed", placed_at: { not: null } },
          select: { submitted_at: true, placed_at: true },
        });
        const avgTimeToFill = placedSubs.length > 0
          ? placedSubs.reduce((sum, s) => {
              const days = s.placed_at ? (s.placed_at.getTime() - s.submitted_at.getTime()) / (1000 * 60 * 60 * 24) : 0;
              return sum + days;
            }, 0) / placedSubs.length
          : null;

        // Upsert the RecruiterReputationScore
        await db.recruiterReputationScore.upsert({
          where: { recruiter_user_id: recruiterUserId },
          update: {
            total_reviews: totalReviews,
            verified_reviews: verifiedCount,
            overall_score: parseFloat(finalOverall.toFixed(1)),
            professionalism_avg: parseFloat(professionalism_avg.toFixed(1)),
            communication_avg: parseFloat(communication_avg.toFixed(1)),
            job_match_avg: parseFloat(job_match_avg.toFixed(1)),
            process_speed_avg: parseFloat(process_speed_avg.toFixed(1)),
            post_placement_avg: parseFloat(post_placement_avg.toFixed(1)),
            total_placements: totalPlacements,
            avg_time_to_fill_days: avgTimeToFill !== null ? parseFloat(avgTimeToFill.toFixed(1)) : null,
            badge_tier: badge_tier,
            is_top_recruiter: badge_tier === "top",
            is_verified_recruiter: badge_tier === "verified" || badge_tier === "top",
            last_calculated_at: now,
          },
          create: {
            recruiter_user_id: recruiterUserId,
            total_reviews: totalReviews,
            verified_reviews: verifiedCount,
            overall_score: parseFloat(finalOverall.toFixed(1)),
            professionalism_avg: parseFloat(professionalism_avg.toFixed(1)),
            communication_avg: parseFloat(communication_avg.toFixed(1)),
            job_match_avg: parseFloat(job_match_avg.toFixed(1)),
            process_speed_avg: parseFloat(process_speed_avg.toFixed(1)),
            post_placement_avg: parseFloat(post_placement_avg.toFixed(1)),
            total_placements: totalPlacements,
            avg_time_to_fill_days: avgTimeToFill !== null ? parseFloat(avgTimeToFill.toFixed(1)) : null,
            badge_tier: badge_tier,
            is_top_recruiter: badge_tier === "top",
            is_verified_recruiter: badge_tier === "verified" || badge_tier === "top",
          },
        });

        result.reputation_scores.processed++;
        result.reputation_scores.updated++;
      } catch (err) {
        console.error(`[CRON_MARKETPLACE] Reputation recalc failed for recruiter #${entry.recruiter_user_id}:`, err);
        result.reputation_scores.errors++;
      }
    }
  } catch (err) {
    console.error("[CRON_MARKETPLACE] Task 2 (reputation recalc) failed:", err);
    result.reputation_scores.errors++;
  }

  // ─────────────────────────────────────────────────────────────────────
  // TASK 3: AUTO-VIOLATION CHECK
  // ─────────────────────────────────────────────────────────────────────
  try {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Group upheld reports by recruiter in last 30 days
    const recentUpheldReports = await db.recruiterReport.groupBy({
      by: ["recruiter_user_id"],
      where: {
        status: "resolved",
        resolution_action: { in: ["temp_suspension", "perm_ban", "rtr_revoked"] },
        resolved_at: { gte: thirtyDaysAgo },
      },
      _count: { _all: true },
    });

    // Group upheld reports in last 90 days
    const last90UpheldReports = await db.recruiterReport.groupBy({
      by: ["recruiter_user_id"],
      where: {
        status: "resolved",
        resolution_action: { in: ["temp_suspension", "perm_ban", "rtr_revoked"] },
        resolved_at: { gte: ninetyDaysAgo },
      },
      _count: { _all: true },
    });

    // Find upheld 'rtr_violation' reports (any time)
    const rtrViolations = await db.recruiterReport.findMany({
      where: {
        status: "resolved",
        reason_category: "rtr_violation",
        resolution_action: { in: ["temp_suspension", "perm_ban", "rtr_revoked"] },
      },
      select: { recruiter_user_id: true },
      distinct: ["recruiter_user_id"],
    });

    const rtrViolationRecruiterIds = new Set(rtrViolations.map((r) => r.recruiter_user_id));
    const recentCounts = new Map(recentUpheldReports.map((r) => [r.recruiter_user_id, r._count._all]));
    const last90Counts = new Map(last90UpheldReports.map((r) => [r.recruiter_user_id, r._count._all]));

    // Get all recruiters that have any upheld report
    const allRecruiterIds = new Set<number>([
      ...recentCounts.keys(),
      ...last90Counts.keys(),
      ...rtrViolationRecruiterIds,
    ]);

    result.violation_check.recruiters_checked = allRecruiterIds.size;

    for (const recruiterId of allRecruiterIds) {
      const recentCount = recentCounts.get(recruiterId) ?? 0;
      const last90Count = last90Counts.get(recruiterId) ?? 0;
      const hasRtrViolation = rtrViolationRecruiterIds.has(recruiterId);

      let suspensionDays = 0;
      let reason = "";

      if (last90Count >= 5) {
        suspensionDays = 90;
        reason = `5+ upheld reports in 90 days (${last90Count} total)`;
      } else if (recentCount >= 3) {
        suspensionDays = 30;
        reason = `3+ upheld reports in 30 days (${recentCount} total)`;
      } else if (hasRtrViolation) {
        suspensionDays = 14;
        reason = "upheld RTR violation";
      }

      if (suspensionDays > 0) {
        try {
          // Check if already suspended
          const user = await db.user.findUnique({
            where: { id: recruiterId },
            select: { id: true, account_status: true, first_name: true, last_name: true, email: true },
          });
          if (!user) continue;
          if (user.account_status === "suspended" || user.account_status === "banned") continue;

          // Suspend
          await db.user.update({
            where: { id: recruiterId },
            data: { account_status: "suspended" },
          });

          // Audit log
          await db.auditLog.create({
            data: {
              user_id: null, // system action
              role: "system",
              action: "auto_suspension_violation_threshold",
              entity_type: "user",
              entity_id: recruiterId,
              details: `Auto-suspended for ${suspensionDays} days — ${reason}. Recruiter: ${user.first_name ?? ""} ${user.last_name ?? ""} (${user.email}).`,
            },
          });

          // Notify the recruiter
          try {
            const { createNotification } = await import("@/lib/notifications/create");
            await createNotification({
              userId: recruiterId,
              category: "compliance",
              priority: "urgent",
              title: `Account suspended for ${suspensionDays} days`,
              message: `Your account has been auto-suspended due to: ${reason}. Contact support if you believe this is in error.`,
              actionUrl: "/settings",
              actionLabel: "Contact support",
            });
          } catch (notifErr) {
            console.error("[CRON_MARKETPLACE] Failed to notify suspended recruiter:", notifErr);
          }

          result.violation_check.auto_suspensions++;
          result.violation_check.details.push(`Recruiter #${recruiterId} (${user.email}) suspended ${suspensionDays}d — ${reason}`);
        } catch (err) {
          console.error(`[CRON_MARKETPLACE] Failed to suspend recruiter #${recruiterId}:`, err);
          result.violation_check.errors++;
        }
      }
    }
  } catch (err) {
    console.error("[CRON_MARKETPLACE] Task 3 (violation check) failed:", err);
    result.violation_check.errors++;
  }

  const durationMs = Date.now() - startedAt;
  console.log(`[CRON_MARKETPLACE] Complete — duration: ${durationMs}ms`, result);

  return NextResponse.json({
    success: true,
    started_at: result.started_at,
    duration_ms: durationMs,
    result,
  });
}
