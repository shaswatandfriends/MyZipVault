import { db } from "@/lib/db";

/**
 * Recruiter access scope helper.
 *
 * Per Gap 1 fix (all three layers apply):
 *   - Individual recruiter (client_recruiter): sees ONLY their own candidates
 *     (candidates where they personally have consent_share or checklist_request)
 *   - Client Admin: sees ALL recruiters' candidates in their org
 *     (any candidate engaged by any recruiter at their company)
 *
 * This helper returns the list of client_user_ids that the current user
 * is allowed to query on behalf of.
 */

export interface RecruiterScope {
  /** List of client_user_ids the current user can act on behalf of */
  clientUserIds: number[];
  /** True if the user is a client_admin (sees all recruiters in org) */
  isAdmin: boolean;
  /** The current user's ID */
  userId: number;
  /** The current user's organization ID (null if individual recruiter with no org) */
  organizationId: number | null;
}

/**
 * Get the list of client_user_ids the current user can act on behalf of.
 *
 * - client_recruiter: returns [userId] (only their own)
 * - client_admin: returns all recruiter+admin user IDs in their org
 *
 * Returns null if the role is not a recruiter/admin or if org is missing
 * for client_admin.
 */
export async function getScopedClientUserIds(
  userRole: string,
  userId: number,
  organizationId: number | null
): Promise<RecruiterScope | null> {
  // Only recruiters and client admins
  if (!["client_recruiter", "client_admin"].includes(userRole)) {
    return null;
  }

  // Individual recruiter: only their own ID
  if (userRole === "client_recruiter") {
    return {
      clientUserIds: [userId],
      isAdmin: false,
      userId,
      organizationId,
    };
  }

  // Client Admin: all recruiters + admins in their org
  if (!organizationId) {
    // Edge case: admin without org — treat as individual
    return {
      clientUserIds: [userId],
      isAdmin: true,
      userId,
      organizationId: null,
    };
  }

  const orgUsers = await db.user.findMany({
    where: {
      organization_id: organizationId,
      role: { in: ["client_admin", "client_recruiter"] },
      account_status: "active",
    },
    select: { id: true },
  });

  return {
    clientUserIds: orgUsers.map((u) => u.id),
    isAdmin: true,
    userId,
    organizationId,
  };
}

/**
 * Check if a recruiter/admin can access a specific candidate.
 *
 * Returns true if:
 *   - Individual recruiter: they have a consent_share OR checklist_request
 *     with this candidate (client_user_id = their own ID)
 *   - Client Admin: any recruiter in their org has consent_share OR
 *     checklist_request with this candidate
 */
export async function canRecruiterAccessCandidate(
  userRole: string,
  userId: number,
  organizationId: number | null,
  candidateUserId: number
): Promise<boolean> {
  const scope = await getScopedClientUserIds(userRole, userId, organizationId);
  if (!scope) return false;

  // Check if any scoped user has engaged with this candidate
  const [consentShare, checklistRequest] = await Promise.all([
    db.consentShare.findFirst({
      where: {
        client_user_id: { in: scope.clientUserIds },
        candidate_user_id: candidateUserId,
        is_deleted: false,
      },
      select: { id: true },
    }),
    db.checklistRequest.findFirst({
      where: {
        client_user_id: { in: scope.clientUserIds },
        candidate_user_id: candidateUserId,
      },
      select: { id: true },
    }),
  ]);

  return !!(consentShare || checklistRequest);
}

/**
 * Check if a recruiter/admin can unlock a specific consent share.
 *
 * Returns true if:
 *   - Individual recruiter: the consent_share.client_user_id = their own ID
 *   - Client Admin: the consent_share.client_user_id belongs to a recruiter
 *     in their org
 *
 * This is stricter than canRecruiterAccessCandidate — the consent share
 * must be specifically addressed to a recruiter in the scoped list,
 * not just any engagement with the candidate.
 */
export async function canRecruiterUnlockShare(
  userRole: string,
  userId: number,
  organizationId: number | null,
  consentShareClientUserId: number
): Promise<boolean> {
  const scope = await getScopedClientUserIds(userRole, userId, organizationId);
  if (!scope) return false;

  return scope.clientUserIds.includes(consentShareClientUserId);
}
