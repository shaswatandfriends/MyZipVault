import { db } from "@/lib/db";

// ─── Feature Credit Costs ──────────────────────────────────────────────
// Hardcoded fallback defaults. The ACTUAL costs come from the PlatformSetting
// table (key format: 'credit_cost.<feature_name>'). These are only used when
// the PlatformSetting row is missing (e.g., before the migration is applied).
const FEATURE_CREDIT_COSTS: Record<string, number> = {
  unlock_candidate: 1,
  view_credentials: 1,
  view_references: 1,
  view_resume: 1,
  send_share_request: 0, // free
  view_full_packet: 3,
  // Marketplace additions (Phase 0)
  reveal_email: 2,
  reveal_phone: 2,
  submit_candidate: 2,
  send_skill_checklist: 2,
};

// ─── In-memory cache for credit costs ──────────────────────────────────
// PlatformSetting is read on every credit check. To avoid hitting the DB
// on every call, cache the costs for 60 seconds.
interface CachedCosts {
  costs: Record<string, number>;
  expiresAt: number;
}
let cachedCosts: CachedCosts | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// ─── Low Credit Threshold ──────────────────────────────────────────────
export const LOW_CREDIT_THRESHOLD = 5;

// ─── Types ─────────────────────────────────────────────────────────────
export interface CreditAccessResult {
  allowed: boolean;
  creditsRequired: number;
  currentBalance: number;
  reason?: string;
}

// ─── loadCreditCostsFromSettings ────────────────────────────────────────
/**
 * Loads all credit_cost.* entries from PlatformSetting.
 * Returns a merged map of { featureName: cost }.
 *
 * Cached for 60 seconds to avoid hitting the DB on every credit check.
 */
async function loadCreditCostsFromSettings(): Promise<Record<string, number>> {
  // Return cache if fresh
  if (cachedCosts && Date.now() < cachedCosts.expiresAt) {
    return cachedCosts.costs;
  }

  try {
    const settings = await db.platformSetting.findMany({
      where: { setting_key: { startsWith: "credit_cost." } },
      select: { setting_key: true, setting_value: true },
    });

    const costs: Record<string, number> = { ...FEATURE_CREDIT_COSTS };
    for (const s of settings) {
      const featureName = s.setting_key.replace("credit_cost.", "");
      const value = parseInt(s.setting_value, 10);
      if (!isNaN(value) && value >= 0) {
        costs[featureName] = value;
      }
    }

    cachedCosts = { costs, expiresAt: Date.now() + CACHE_TTL_MS };
    return costs;
  } catch (err) {
    // If PlatformSetting table doesn't exist yet (pre-migration), fall back.
    console.error("[CREDIT_GATING] Failed to load costs from PlatformSetting, using hardcoded fallback:", err);
    return { ...FEATURE_CREDIT_COSTS };
  }
}

// ─── getCreditsRequired ────────────────────────────────────────────────
/**
 * Returns how many credits a feature costs.
 *
 * Synchronous version — uses hardcoded fallback ONLY.
 * For the most up-to-date cost (which may have been changed by superadmin),
 * use the async version `getCreditsRequiredAsync` below.
 *
 * @deprecated Prefer getCreditsRequiredAsync for marketplace routes.
 */
export function getCreditsRequired(featureName: string): number {
  return FEATURE_CREDIT_COSTS[featureName] ?? 1;
}

// ─── getCreditsRequiredAsync ───────────────────────────────────────────
/**
 * Async version that reads from PlatformSetting first, falls back to
 * hardcoded defaults. Cached for 60 seconds.
 *
 * Use this in all marketplace routes where the superadmin-configurable
 * credit cost matters.
 */
export async function getCreditsRequiredAsync(featureName: string): Promise<number> {
  const costs = await loadCreditCostsFromSettings();
  return costs[featureName] ?? 1;
}

// ─── invalidateCreditCostCache ──────────────────────────────────────────
/**
 * Forces the next getCreditsRequiredAsync call to re-read from PlatformSetting.
 * Call this after a superadmin updates credit costs via /superadmin/settings.
 */
export function invalidateCreditCostCache(): void {
  cachedCosts = null;
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
 *
 * Uses the async credit-cost lookup so superadmin-configured costs are
 * respected. Falls back to hardcoded defaults if PlatformSetting is
 * unavailable.
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

  // 2. Get credit cost (async — reads from PlatformSetting)
  const creditsRequired = await getCreditsRequiredAsync(featureName);

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
