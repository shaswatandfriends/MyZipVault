import { db } from "@/lib/db";

/**
 * Credit limit configuration for recruiters.
 *
 * Unverified recruiters get lower limits (to encourage verification).
 * Verified recruiters get higher limits (they've proven they're real).
 *
 * When a recruiter hits their limit:
 *   - If unverified → popup: "Verify your account to get more reach"
 *   - If verified → popup: "Per community guidelines, we cannot allow
 *     more credits due to spam risk"
 */
export const CREDIT_LIMITS = {
  unverified: {
    daily: 10,
    monthly: 100,
  },
  verified: {
    daily: 50,
    monthly: 500,
  },
} as const;

export interface CreditCheckResult {
  allowed: boolean;
  reason?: "daily_limit" | "monthly_limit";
  remainingDaily: number;
  remainingMonthly: number;
  dailyLimit: number;
  monthlyLimit: number;
  isVerified: boolean;
  popupMessage?: string;
  popupTitle?: string;
}

/**
 * Check if a recruiter can spend `amount` credits.
 * Resets daily/monthly counters if they've expired.
 *
 * Returns:
 *   allowed: true if the recruiter can spend the credits
 *   reason: why not (if allowed is false)
 *   remainingDaily/Monthly: how many credits left
 *   popupMessage: what to show in the popup if blocked
 */
export async function checkCreditLimit(
  userId: number,
  amount: number = 1,
): Promise<CreditCheckResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      verification_status: true,
      credit_daily_used: true,
      credit_daily_reset_at: true,
      credit_monthly_used: true,
      credit_monthly_reset_at: true,
    },
  });

  if (!user) {
    return {
      allowed: false,
      remainingDaily: 0,
      remainingMonthly: 0,
      dailyLimit: 0,
      monthlyLimit: 0,
      isVerified: false,
    };
  }

  const isVerified = user.verification_status === "verified";
  const limits = isVerified ? CREDIT_LIMITS.verified : CREDIT_LIMITS.unverified;

  const now = new Date();
  let dailyUsed = user.credit_daily_used;
  let monthlyUsed = user.credit_monthly_used;

  // Reset daily counter if it's a new day
  const dailyReset = user.credit_daily_reset_at;
  if (dailyReset) {
    const dailyResetDate = new Date(dailyReset);
    if (dailyResetDate.getDate() !== now.getDate() ||
        dailyResetDate.getMonth() !== now.getMonth() ||
        dailyResetDate.getFullYear() !== now.getFullYear()) {
      dailyUsed = 0;
      await db.user.update({
        where: { id: userId },
        data: {
          credit_daily_used: 0,
          credit_daily_reset_at: now,
        },
      });
    }
  }

  // Reset monthly counter if it's a new month
  const monthlyReset = user.credit_monthly_reset_at;
  if (monthlyReset) {
    const monthlyResetDate = new Date(monthlyReset);
    if (monthlyResetDate.getMonth() !== now.getMonth() ||
        monthlyResetDate.getFullYear() !== now.getFullYear()) {
      monthlyUsed = 0;
      await db.user.update({
        where: { id: userId },
        data: {
          credit_monthly_used: 0,
          credit_monthly_reset_at: now,
        },
      });
    }
  }

  const remainingDaily = limits.daily - dailyUsed;
  const remainingMonthly = limits.monthly - monthlyUsed;

  // Check daily limit
  if (dailyUsed + amount > limits.daily) {
    return {
      allowed: false,
      reason: "daily_limit",
      remainingDaily: Math.max(0, remainingDaily),
      remainingMonthly: Math.max(0, remainingMonthly),
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      isVerified,
      popupTitle: isVerified ? "Daily credit limit reached" : "Get more credits with verification",
      popupMessage: isVerified
        ? "Per our community guidelines, we cannot grant additional daily credits to prevent spam risk. Your daily limit resets at midnight."
        : "You've reached your daily credit limit. Verify your account to get 5x more credits (50/day instead of 10/day) and unlock greater reach.",
    };
  }

  // Check monthly limit
  if (monthlyUsed + amount > limits.monthly) {
    return {
      allowed: false,
      reason: "monthly_limit",
      remainingDaily: Math.max(0, remainingDaily),
      remainingMonthly: Math.max(0, remainingMonthly),
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      isVerified,
      popupTitle: isVerified ? "Monthly credit limit reached" : "Get more credits with verification",
      popupMessage: isVerified
        ? "Per our community guidelines, we cannot grant additional monthly credits to prevent spam risk. Your monthly limit resets on the 1st of next month."
        : "You've reached your monthly credit limit. Verify your account to get 5x more credits (500/month instead of 100/month) and unlock greater reach.",
    };
  }

  return {
    allowed: true,
    remainingDaily: Math.max(0, remainingDaily - amount),
    remainingMonthly: Math.max(0, remainingMonthly - amount),
    dailyLimit: limits.daily,
    monthlyLimit: limits.monthly,
    isVerified,
  };
}

/**
 * Increment the credit usage counters after a successful credit spend.
 * Call this AFTER checkCreditLimit returns allowed: true and the action
 * has been completed.
 */
export async function incrementCreditUsage(userId: number, amount: number = 1): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      credit_daily_used: { increment: amount },
      credit_monthly_used: { increment: amount },
    },
  });
}

/**
 * Get the current credit usage + limits for display.
 */
export async function getCreditUsage(userId: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      verification_status: true,
      credit_daily_used: true,
      credit_monthly_used: true,
    },
  });

  if (!user) return null;

  const isVerified = user.verification_status === "verified";
  const limits = isVerified ? CREDIT_LIMITS.verified : CREDIT_LIMITS.unverified;

  return {
    isVerified,
    dailyUsed: user.credit_daily_used,
    monthlyUsed: user.credit_monthly_used,
    dailyLimit: limits.daily,
    monthlyLimit: limits.monthly,
    dailyRemaining: Math.max(0, limits.daily - user.credit_daily_used),
    monthlyRemaining: Math.max(0, limits.monthly - user.credit_monthly_used),
  };
}
