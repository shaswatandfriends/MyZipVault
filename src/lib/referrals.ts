import { db } from "@/lib/db";

/**
 * Referral reward configuration — credits granted to the referrer's org.
 *
 * Candidates don't earn credits (they don't have an org). Recruiters and
 * employers receive these credits when their referral completes a qualifying
 * action. The numbers are tunable here without a DB migration.
 */
export const REFERRAL_REWARDS = {
  candidate_verified: 5,    // per candidate who verifies email + completes profile
  recruiter_approved: 25,   // per recruiter approved + first submission
  employer_first_job: 50,   // per employer first job posted with commission budget
} as const;

/**
 * Look up the referrer user from a `ref` UUID string (the referrer's public_id).
 * Returns the user row if found, otherwise null.
 *
 * A valid referrer must be:
 *   - A real user with the given public_id
 *   - In a role that can receive referral credit (candidate, client_recruiter,
 *     client_admin, employer) — candidates get a recorded referral (for stats
 *     only), recruiters/employers get actual credits.
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
 * Grant referral credits (or just record the referral for candidates without
 * an org). Called after a successful signup that came in with a `ref=UUID`
 * cookie. Idempotent — if the audit log already has an entry for this
 * referred_user_id, we skip.
 *
 * Parameters:
 *   referrerId: the user who shared their referral link
 *   referredUserId: the new user who just signed up
 *   referredEmail: the new user's email (for the audit log description)
 *
 * Behavior:
 *   - If the referrer has an organization_id (recruiter/employer), increment
 *     the org's credits_balance by REFERRAL_REWARDS.candidate_verified (5)
 *     and create a CreditTransaction with type 'referral_bonus'.
 *   - If the referrer has no organization (candidate), just write an audit
 *     log entry with action 'referral_signup_recorded' (no credits, just
 *     stats).
 *   - Always write an audit log entry so we can count referrals.
 *
 * Returns: the number of credits actually granted (0 if candidate referrer
 *   or if idempotency kicked in).
 */
export async function grantReferralCredits({
  referrerId,
  referredUserId,
  referredEmail,
}: {
  referrerId: number;
  referredUserId: number;
  referredEmail: string;
}): Promise<number> {
  try {
    // Fetch the referrer to get their org id
    const referrer = await db.user.findUnique({
      where: { id: referrerId },
      select: { id: true, organization_id: true, role: true, email: true, first_name: true, last_name: true },
    });
    if (!referrer) return 0;

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

    const creditsGranted = REFERRAL_REWARDS.candidate_verified;

    // If the referrer has an org, grant credits to the org
    if (referrer.organization_id) {
      await db.organization.update({
        where: { id: referrer.organization_id },
        data: { credits_balance: { increment: creditsGranted } },
      });

      await db.creditTransaction.create({
        data: {
          organization_id: referrer.organization_id,
          transaction_type: "referral_bonus",
          credit_amount: creditsGranted,
          description: `Referral bonus: new user ${referredEmail} signed up via your referral link (user #${referredUserId})`,
        },
      });

      await db.auditLog.create({
        data: {
          user_id: referrerId,
          role: referrer.role,
          action: "referral_signup_credits_granted",
          entity_type: "user",
          entity_id: referredUserId,
          details: `Granted ${creditsGranted} credits for referring ${referredEmail} (user #${referredUserId}).`,
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
          actionUrl: "/referral-program",
          actionLabel: "View referrals",
        });
      } catch (notifErr) {
        console.error("[REFERRAL] Failed to notify referrer:", notifErr);
      }

      return creditsGranted;
    }

    // No org — just record the referral (for stats)
    await db.auditLog.create({
      data: {
        user_id: referrerId,
        role: referrer.role,
        action: "referral_signup_recorded",
        entity_type: "user",
        entity_id: referredUserId,
        details: `Referred ${referredEmail} (user #${referredUserId}). No credits granted (referrer has no organization).`,
      },
    });

    // Notify the referrer (just a thank-you, no credits)
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: referrerId,
        category: "system",
        priority: "info",
        title: "Someone signed up via your link! 🎉",
        message: `${referredEmail} signed up via your referral link. Thank you for spreading the word about MyZipVault!`,
        actionUrl: "/referral-program",
        actionLabel: "View referral program",
      });
    } catch (notifErr) {
      console.error("[REFERRAL] Failed to notify referrer (no credits case):", notifErr);
    }

    return 0;
  } catch (error) {
    console.error("[REFERRAL_GRANT]", error);
    return 0;
  }
}
