import { db } from "@/lib/db";

/**
 * Reward grant automation.
 *
 * Each function reads the configured reward amount from PlatformSetting
 * (key: credit_reward_<action>) and grants credits to the user's org.
 * Falls back to default amounts if not configured.
 *
 * All grants are logged in CreditTransaction with transaction_type 'reward'
 * and an audit log entry. Idempotent — skips if already granted for the
 * same action + entity.
 */

const DEFAULT_REWARDS = {
  referral_recruiter: 25,
  referral_employer: 50,
  verification_completed: 100,
  first_job_posted: 10,
  first_candidate_submitted: 5,
  monthly_active: 15,
  profile_complete: 10,
} as const;

type RewardAction = keyof typeof DEFAULT_REWARDS;

/**
 * Read the configured reward amount from PlatformSetting.
 * Falls back to the default if not configured.
 */
async function getRewardAmount(action: RewardAction): Promise<number> {
  try {
    const setting = await db.platformSetting.findUnique({
      where: { setting_key: `credit_reward_${action}` },
    });
    if (setting) {
      const val = parseInt(setting.setting_value, 10);
      if (!isNaN(val) && val >= 0) return val;
    }
  } catch {}
  return DEFAULT_REWARDS[action];
}

/**
 * Check if a reward has already been granted for a specific action + entity.
 * Prevents double-granting (idempotency).
 */
async function isAlreadyGranted(
  userId: number,
  action: RewardAction,
  entityId?: number,
): Promise<boolean> {
  const existing = await db.auditLog.findFirst({
    where: {
      user_id: userId,
      action: `reward_granted_${action}`,
      ...(entityId ? { entity_id: entityId } : {}),
    },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Grant a reward to the user's organization.
 *
 * Parameters:
 *   userId: the user who earned the reward
 *   action: which reward type (e.g. 'verification_completed')
 *   entityId: optional entity ID for idempotency (e.g. job_id for first_job_posted)
 *   description: custom description for the credit transaction
 *
 * Returns: the number of credits granted (0 if not applicable or already granted)
 */
export async function grantReward({
  userId,
  action,
  entityId,
  description,
}: {
  userId: number;
  action: RewardAction;
  entityId?: number;
  description?: string;
}): Promise<number> {
  try {
    // Fetch user to get their org
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, organization_id: true, role: true, email: true },
    });
    if (!user || !user.organization_id) return 0;

    // Check idempotency — skip if already granted
    if (await isAlreadyGranted(userId, action, entityId)) {
      return 0;
    }

    const credits = await getRewardAmount(action);
    if (credits <= 0) return 0;

    // Grant credits to the org
    await db.organization.update({
      where: { id: user.organization_id },
      data: { credits_balance: { increment: credits } },
    });

    // Log the credit transaction
    await db.creditTransaction.create({
      data: {
        organization_id: user.organization_id,
        transaction_type: "reward",
        credit_amount: credits,
        description: description || `Reward: ${action.replace(/_/g, " ")}`,
      },
    });

    // Audit log (for idempotency check)
    await db.auditLog.create({
      data: {
        user_id: userId,
        role: user.role,
        action: `reward_granted_${action}`,
        entity_type: "user",
        entity_id: entityId || userId,
        details: `Granted ${credits} credits for ${action}.`,
      },
    });

    // Notify the user
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId,
        category: "credit",
        priority: "info",
        title: `You earned ${credits} credits! 🎉`,
        message: description || `Reward: ${action.replace(/_/g, " ")}`,
        actionUrl: "/recruiter/billing",
        actionLabel: "View credits",
      });
    } catch {}

    return credits;
  } catch (error) {
    console.error(`[GRANT_REWARD:${action}]`, error);
    return 0;
  }
}

/**
 * Convenience wrappers for each reward type.
 */

export async function grantVerificationReward(userId: number): Promise<number> {
  return grantReward({
    userId,
    action: "verification_completed",
    description: "Reward: Recruiter certification completed",
  });
}

export async function grantFirstJobReward(userId: number, jobId: number): Promise<number> {
  return grantReward({
    userId,
    action: "first_job_posted",
    entityId: jobId,
    description: "Reward: First job posted",
  });
}

export async function grantFirstSubmissionReward(userId: number, submissionId: number): Promise<number> {
  return grantReward({
    userId,
    action: "first_candidate_submitted",
    entityId: submissionId,
    description: "Reward: First candidate submitted",
  });
}

export async function grantMonthlyActiveReward(userId: number): Promise<number> {
  return grantReward({
    userId,
    action: "monthly_active",
    description: "Reward: Monthly active recruiter",
  });
}

export async function grantProfileCompleteReward(userId: number): Promise<number> {
  return grantReward({
    userId,
    action: "profile_complete",
    description: "Reward: Profile completion 100%",
  });
}
