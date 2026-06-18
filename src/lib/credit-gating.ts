import { db } from "@/lib/db";

// ─── Feature Credit Costs ──────────────────────────────────────────────
const FEATURE_CREDIT_COSTS: Record<string, number> = {
  unlock_candidate: 1,
  view_credentials: 1,
  view_references: 1,
  view_resume: 1,
  send_share_request: 0, // free
  view_full_packet: 3,
};

// ─── Low Credit Threshold ──────────────────────────────────────────────
export const LOW_CREDIT_THRESHOLD = 5;

// ─── Types ─────────────────────────────────────────────────────────────
export interface CreditAccessResult {
  allowed: boolean;
  creditsRequired: number;
  currentBalance: number;
  reason?: string;
}

// ─── getCreditsRequired ────────────────────────────────────────────────
/**
 * Returns how many credits a feature costs.
 * Unknown features default to 1 credit.
 */
export function getCreditsRequired(featureName: string): number {
  return FEATURE_CREDIT_COSTS[featureName] ?? 1;
}

// ─── getFeatureGate ────────────────────────────────────────────────────
/**
 * Returns whether the feature is enabled via the global FeatureFlag table.
 * If the flag does not exist, the feature is considered enabled by default.
 */
export async function getFeatureGate(featureName: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({
    where: { flag_name: featureName },
    select: { is_enabled: true },
  });

  // If no flag exists, feature is enabled by default
  if (!flag) return true;

  return flag.is_enabled;
}

// ─── checkCreditAccess ─────────────────────────────────────────────────
/**
 * Checks if the organization has enough credits for the given feature
 * and whether the feature is enabled via feature flags.
 */
export async function checkCreditAccess(
  organizationId: number,
  featureName: string
): Promise<CreditAccessResult> {
  // 1. Check feature flag
  const featureEnabled = await getFeatureGate(featureName);
  if (!featureEnabled) {
    return {
      allowed: false,
      creditsRequired: getCreditsRequired(featureName),
      currentBalance: 0,
      reason: `Feature "${featureName}" is currently disabled. Please contact support.`,
    };
  }

  // 2. Get credit cost
  const creditsRequired = getCreditsRequired(featureName);

  // 3. Free features are always allowed (if flag is on)
  if (creditsRequired === 0) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { credits_balance: true },
    });

    return {
      allowed: true,
      creditsRequired: 0,
      currentBalance: org?.credits_balance ?? 0,
    };
  }

  // 4. Check balance
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { credits_balance: true },
  });

  if (!org) {
    return {
      allowed: false,
      creditsRequired,
      currentBalance: 0,
      reason: "Organization not found.",
    };
  }

  const currentBalance = org.credits_balance;

  if (currentBalance < creditsRequired) {
    return {
      allowed: false,
      creditsRequired,
      currentBalance,
      reason: `Insufficient credits. You need ${creditsRequired} credit${creditsRequired > 1 ? "s" : ""} but only have ${currentBalance}.`,
    };
  }

  return {
    allowed: true,
    creditsRequired,
    currentBalance,
  };
}

// ─── deductCredits ─────────────────────────────────────────────────────
/**
 * Atomically deducts credits from an organization and creates a CreditTransaction record.
 *
 * ATOMICITY (Gap 11 fix):
 *   Uses a conditional UPDATE with WHERE credits_balance >= amount.
 *   If two concurrent requests both pass checkCreditAccess, only one will
 *   actually succeed in deducting — the other gets a row count of 0 and
 *   throws an error.
 *
 * Should only be called after checkCreditAccess has confirmed sufficient balance.
 * Throws Error if the deduction fails (race condition lost, or org not found).
 */
export async function deductCredits(
  organizationId: number,
  amount: number,
  description: string,
  userId?: number
): Promise<{ newBalance: number }> {
  if (amount <= 0) {
    throw new Error(`Invalid deduction amount: ${amount}`);
  }

  // Atomic conditional update — only succeeds if balance is still sufficient.
  // Prisma's updateMany returns { count: number } — count > 0 means it worked.
  const updateResult = await db.organization.updateMany({
    where: {
      id: organizationId,
      credits_balance: { gte: amount }, // ← atomic guard
    },
    data: {
      credits_balance: { decrement: amount },
    },
  });

  if (updateResult.count === 0) {
    // Either org doesn't exist, OR balance was insufficient (race condition lost)
    // Re-check to give a useful error message
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { credits_balance: true },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    throw new Error(
      `Insufficient credits for org ${organizationId}: needed ${amount}, had ${org.credits_balance}. ` +
        `This was likely a race condition — another request consumed the credits first.`
    );
  }

  // Fetch the new balance (post-decrement)
  const updatedOrg = await db.organization.findUnique({
    where: { id: organizationId },
    select: { credits_balance: true },
  });

  const newBalance = updatedOrg?.credits_balance ?? 0;

  // Create a credit transaction record (audit trail)
  await db.creditTransaction.create({
    data: {
      organization_id: organizationId,
      transaction_type: "deduction",
      credit_amount: -amount,
      description: userId
        ? `${description} (by user #${userId})`
        : description,
    },
  });

  return { newBalance };
}

// ─── isLowCredits ──────────────────────────────────────────────────────
/**
 * Returns true if the organization's credit balance is at or below the low threshold.
 */
export function isLowCredits(currentBalance: number): boolean {
  return currentBalance <= LOW_CREDIT_THRESHOLD;
}
