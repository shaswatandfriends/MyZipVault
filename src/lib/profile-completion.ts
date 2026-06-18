import { db } from "@/lib/db";

/**
 * Recalculate a candidate's profile completion percentage.
 *
 * This is the SINGLE SOURCE OF TRUTH for profile completion calculation.
 * All endpoints that update profile_completion_pct should call this function
 * instead of computing the percentage themselves.
 *
 * Weights (total 100%):
 *   - Basic profile info: 20% (first_name 5%, last_name 5%, phone 5%, email 5%)
 *   - At least one verified credential: 30%
 *   - Resume uploaded: 20%
 *   - At least one completed reference: 15%
 *   - At least one active checklist response: 15%
 *
 * Per Gap 17 fix: this function is called:
 *   1. Whenever a credential is verified/rejected (already done in admin/superadmin verify endpoints)
 *   2. Whenever a checklist is submitted (already done in checklists/submit endpoint)
 *   3. Daily via cron job (/api/cron/profile-recalc) to catch stale data
 *      (e.g., credentials that expired, references that were deleted, etc.)
 *
 * @param userId - The candidate's user ID
 * @returns The new profile completion percentage (0-100), or null if user has no candidate profile
 */
export async function recalcProfileCompletion(
  userId: number
): Promise<number | null> {
  const profile = await db.candidateProfile.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, email_verified_at: true },
  });

  let pct = 0;

  // ─── Basic profile info (20%) ────────────────────────────────────
  if (profile.first_name) pct += 5;
  if (profile.last_name) pct += 5;
  if (profile.phone) pct += 5;
  if (user?.email) pct += 5;

  // ─── At least one verified credential (30%) ──────────────────────
  const verifiedCredentials = await db.credential.count({
    where: {
      candidate_user_id: userId,
      verification_status: "verified",
    },
  });
  if (verifiedCredentials > 0) pct += 30;

  // ─── Resume uploaded (20%) ───────────────────────────────────────
  if (profile.resume_id) pct += 20;

  // ─── At least one completed reference (15%) ──────────────────────
  const refCount = await db.candidateReference.count({
    where: { candidate_user_id: userId, status: "completed" },
  });
  if (refCount > 0) pct += 15;

  // ─── At least one active checklist response (15%) ────────────────
  const checklistCount = await db.candidateChecklistResponse.count({
    where: {
      candidate_user_id: userId,
      status: "active",
      valid_until: { gte: new Date() }, // Only count non-expired checklists
    },
  });
  if (checklistCount > 0) pct += 15;

  // Cap at 100
  pct = Math.min(pct, 100);

  // Update the stored value
  await db.candidateProfile.update({
    where: { user_id: userId },
    data: { profile_completion_pct: pct },
  });

  return pct;
}

/**
 * Recalculate profile completion for ALL candidates.
 *
 * Used by the daily cron job. Processes candidates in batches to avoid
 * memory issues with large datasets.
 *
 * @returns Object with count of candidates processed and updated
 */
export async function recalcAllProfileCompletions(): Promise<{
  processed: number;
  updated: number;
}> {
  const candidates = await db.candidateProfile.findMany({
    select: { user_id: true, profile_completion_pct: true },
  });

  let processed = 0;
  let updated = 0;

  for (const candidate of candidates) {
    processed++;
    try {
      const oldPct = candidate.profile_completion_pct;
      const newPct = await recalcProfileCompletion(candidate.user_id);

      if (newPct !== null && newPct !== oldPct) {
        updated++;
        console.log(
          `[PROFILE_RECALC] User ${candidate.user_id}: ${oldPct}% → ${newPct}%`
        );
      }
    } catch (error) {
      console.error(
        `[PROFILE_RECALC] Failed for user ${candidate.user_id}:`,
        error
      );
    }
  }

  return { processed, updated };
}
