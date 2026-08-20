/**
 * BOB helpers — utilities for linking entities to recruiter leads.
 *
 * Used by event hooks to find a recruiter lead based on a candidate's
 * email + organization, so we can fire status engine events even when
 * the calling code doesn't know about the lead system.
 */

import { db } from "@/lib/db";

/**
 * Find a recruiter lead by candidate's email within an organization.
 *
 * Looks for a lead whose email matches (case-insensitive) and belongs to
 * the given organization. Returns the most recently active match.
 *
 * Used by:
 *   - Send Request hook (onDocRequested) — looks up lead by candidate email
 *   - Credential upload hook (onDocUploaded) — looks up lead by candidate email
 *
 * Returns null if no lead found.
 */
export async function findLeadByCandidateEmail(
  email: string,
  organizationId: number,
): Promise<{ id: number; recruiter_user_id: number } | null> {
  if (!email || !organizationId) return null;

  const lead = await db.recruiterLead.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      organization_id: organizationId,
    },
    orderBy: { last_activity_at: "desc" },
    select: { id: true, recruiter_user_id: true },
  });

  return lead ?? null;
}

/**
 * Find a recruiter lead by the linked candidate_user_id.
 *
 * Used when a candidate (who already has a platform account) takes an
 * action — we look up their lead via the candidate_user_id FK.
 */
export async function findLeadByCandidateUserId(
  candidateUserId: number,
): Promise<{ id: number; recruiter_user_id: number; organization_id: number } | null> {
  if (!candidateUserId) return null;

  const lead = await db.recruiterLead.findFirst({
    where: { candidate_user_id: candidateUserId },
    orderBy: { last_activity_at: "desc" },
    select: { id: true, recruiter_user_id: true, organization_id: true },
  });

  return lead ?? null;
}

/**
 * Find a recruiter lead by candidate's email within a recruiter's own BOB
 * (not the whole org — only leads owned by this specific recruiter).
 *
 * Used when we know which recruiter initiated the action and only want
 * to update leads in their personal BOB.
 */
export async function findLeadInRecruiterBob(
  email: string,
  recruiterUserId: number,
): Promise<{ id: number; organization_id: number } | null> {
  if (!email || !recruiterUserId) return null;

  const lead = await db.recruiterLead.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      recruiter_user_id: recruiterUserId,
    },
    orderBy: { last_activity_at: "desc" },
    select: { id: true, organization_id: true },
  });

  return lead ?? null;
}
