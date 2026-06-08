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
 * Deducts credits from an organization and creates a CreditTransaction record.
 * Should only be called after checkCreditAccess has confirmed sufficient balance.
 */
export async function deductCredits(
  organizationId: number,
  amount: number,
  description: string,
  userId?: number
): Promise<{ newBalance: number }> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { credits_balance: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const newBalance = org.credits_balance - amount;

  // Update the organization's credit balance
  await db.organization.update({
    where: { id: organizationId },
    data: { credits_balance: newBalance },
  });

  // Create a credit transaction record
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
