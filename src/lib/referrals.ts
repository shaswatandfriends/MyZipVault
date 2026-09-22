import { db } from "@/lib/db";

/**
 * Referral reward configuration — credits granted to the referrer's org.
 *
 * Only recruiters and employers can refer other users (and earn credits).
 * Candidates cannot refer — the referral system is for recruiters/employers
 * who bring in new recruiters or employers. The numbers are tunable here
 * without a DB migration.
 */
export const REFERRAL_REWARDS = {
  recruiter_signup: 25,   // per new recruiter who signs up via referral
  employer_signup: 50,    // per new employer who signs up via referral
} as const;

/**
 * Look up the referrer user from a `ref` UUID string (the referrer's public_id).
 * Returns the user row if found, otherwise null.
 *
 * A valid referrer must be:
 *   - A real user with the given public_id
 *   - In a role that can receive referral credit: client_recruiter,
 *     client_admin, or employer.
 *   - Candidates CANNOT be referrers (they don't have an org and can't
 *     earn credits). The referral system is for recruiters/employers only.
 */
export async function findReferrer(refCode: string | null | undefined) {
  if (!refCode) return null;
  // Trim and validate it looks like a UUID (32 hex chars or 36 with dashes)
  const trimmed = refCode.trim();
  if (!/^[0-9a-fA-F-]{32,36}$/.test(trimmed)) return null;

  try {
    const referrer = await db.user.findFirst({
      where: {
        public_id: trimmed,
        account_status: "active",
        // Only recruiters and employers can refer — NOT candidates
        role: { in: ["client_recruiter", "client_admin", "employer"] },
      },
      select: {
        id: true,
        public_id: true,
        role: true,
        email: true,
        first_name: true,
        last_name: true,
        organization_id: true,
      },
    });
    return referrer;
  } catch {
    return null;
  }
}

/**
 * Grant referral credits to the referrer's organization.
 *
 * Called after a successful recruiter/employer signup that came in with a
 * `ref=UUID` cookie. Idempotent — if the audit log already has an entry for
 * this referred_user_id, we skip.
 *
 * Parameters:
 *   referrerId: the recruiter/employer who shared their referral link
 *   referredUserId: the new user who just signed up
 *   referredEmail: the new user's email (for the audit log description)
 *   referredRole: the role of the referred user (determines credit amount)
 *
 * Behavior:
 *   - Increments the referrer's org credits_balance by the appropriate
 *     REFERRAL_REWARDS amount (25 for recruiter, 50 for employer)
 *   - Creates a CreditTransaction with type 'referral_bonus'
 *   - Writes an audit log entry
 *   - Notifies the referrer
 *
 * Returns: the number of credits actually granted (0 if idempotency kicked in).
 */
export async function grantReferralCredits({
  referrerId,
  referredUserId,
  referredEmail,
  referredRole,
}: {
  referrerId: number;
  referredUserId: number;
  referredEmail: string;
  referredRole: string;
}): Promise<number> {
  try {
    // Fetch the referrer to get their org id
    const referrer = await db.user.findUnique({
      where: { id: referrerId },
      select: { id: true, organization_id: true, role: true, email: true, first_name: true, last_name: true },
    });
    if (!referrer || !referrer.organization_id) return 0;

    // Idempotency: skip if we've already recorded a referral for this
    // referred user (look for an audit log entry with entity_id=referredUserId
    // and one of the referral actions, user_id=referrerId).
    const existing = await db.auditLog.findFirst({
      where: {
        user_id: referrerId,
        entity_id: referredUserId,
        action: { in: ["referral_signup_credits_granted", "referral_signup_recorded"] },
      },
      select: { id: true },
    });
    if (existing) {
      // Already processed — idempotent skip
      return 0;
    }

    // Determine credit amount based on the referred user's role
    const creditsGranted = referredRole === "employer"
      ? REFERRAL_REWARDS.employer_signup
      : REFERRAL_REWARDS.recruiter_signup;

    // Grant credits to the referrer's org
    await db.organization.update({
      where: { id: referrer.organization_id },
      data: { credits_balance: { increment: creditsGranted } },
    });

    await db.creditTransaction.create({
      data: {
        organization_id: referrer.organization_id,
        transaction_type: "referral_bonus",
        credit_amount: creditsGranted,
        description: `Referral bonus: new ${referredRole} ${referredEmail} signed up via your referral link (user #${referredUserId})`,
      },
    });

    await db.auditLog.create({
      data: {
        user_id: referrerId,
        role: referrer.role,
        action: "referral_signup_credits_granted",
        entity_type: "user",
        entity_id: referredUserId,
        details: `Granted ${creditsGranted} credits for referring ${referredEmail} (${referredRole}, user #${referredUserId}).`,
      },
    });

    // Notify the referrer
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: referrerId,
        category: "credit",
        priority: "info",
        title: "Referral bonus! 🎉",
        message: `${referredEmail} signed up via your referral link. You earned ${creditsGranted} credits.`,
        actionUrl: "/recruiter/billing",
        actionLabel: "View credits",
      });
    } catch (notifErr) {
      console.error("[REFERRAL] Failed to notify referrer:", notifErr);
    }

    return creditsGranted;
  } catch (error) {
    console.error("[REFERRAL_GRANT]", error);
    return 0;
  }
}
