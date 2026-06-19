import { db } from "@/lib/db";

/**
 * Simple database-backed rate limiter.
 *
 * Uses the platform_settings table to track rate limit counters.
 * No Redis required — suitable for Vercel Hobby tier.
 *
 * Per Gap 9 fix: applied to signup, forgot-password, and login endpoints.
 *
 * Usage:
 *   const result = await checkRateLimit("signup", ipAddress, 3, 3600);
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
 *   }
 *   // ... proceed with the action ...
 *   await recordRateLimitAttempt("signup", ipAddress);
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

interface RateLimitRecord {
  count: number;
  firstAttemptAt: string; // ISO timestamp
}

/**
 * Check if the rate limit allows a new attempt.
 * Does NOT increment the counter — call recordRateLimitAttempt() after the
 * action succeeds or fails to track it.
 *
 * @param action    - e.g., "signup", "forgot_password", "login_failed"
 * @param identifier - IP address, email, or user ID
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowSeconds - Time window in seconds (e.g., 3600 = 1 hour)
 * @returns { allowed, remaining, resetAt, retryAfterSeconds }
 */
export async function checkRateLimit(
  action: string,
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `ratelimit_${action}_${identifier}`;
  const now = new Date();
  const windowMs = windowSeconds * 1000;

  const record = await db.platformSetting.findUnique({
    where: { setting_key: key },
  });

  if (!record?.setting_value) {
    // No previous attempts — allow
    return {
      allowed: true,
      remaining: maxAttempts,
      resetAt: new Date(now.getTime() + windowMs),
      retryAfterSeconds: 0,
    };
  }

  let data: RateLimitRecord;
  try {
    data = JSON.parse(record.setting_value);
  } catch {
    // Corrupt record — reset and allow
    return {
      allowed: true,
      remaining: maxAttempts,
      resetAt: new Date(now.getTime() + windowMs),
      retryAfterSeconds: 0,
    };
  }

  const firstAttemptAt = new Date(data.firstAttemptAt);
  const elapsedMs = now.getTime() - firstAttemptAt.getTime();

  // If the window has expired, reset the counter
  if (elapsedMs > windowMs) {
    return {
      allowed: true,
      remaining: maxAttempts,
      resetAt: new Date(now.getTime() + windowMs),
      retryAfterSeconds: 0,
    };
  }

  // Window is still active — check count
  if (data.count >= maxAttempts) {
    const resetAt = new Date(firstAttemptAt.getTime() + windowMs);
    const retryAfterSeconds = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  // Still has attempts remaining
  return {
    allowed: true,
    remaining: maxAttempts - data.count,
    resetAt: new Date(firstAttemptAt.getTime() + windowMs),
    retryAfterSeconds: 0,
  };
}

/**
 * Record a rate-limited attempt (increments the counter).
 * Call this AFTER checkRateLimit() returns allowed=true, regardless of
 * whether the action succeeded or failed.
 *
 * @param action    - e.g., "signup", "forgot_password", "login_failed"
 * @param identifier - IP address, email, or user ID
 * @param windowSeconds - Time window in seconds (must match checkRateLimit call)
 */
export async function recordRateLimitAttempt(
  action: string,
  identifier: string,
  windowSeconds: number = 3600
): Promise<void> {
  const key = `ratelimit_${action}_${identifier}`;
  const now = new Date();
  const windowMs = windowSeconds * 1000;

  const record = await db.platformSetting.findUnique({
    where: { setting_key: key },
  });

  if (!record?.setting_value) {
    // First attempt — create new record
    await db.platformSetting.create({
      data: {
        setting_key: key,
        setting_value: JSON.stringify({
          count: 1,
          firstAttemptAt: now.toISOString(),
        } satisfies RateLimitRecord),
      },
    });
    return;
  }

  let data: RateLimitRecord;
  try {
    data = JSON.parse(record.setting_value);
  } catch {
    // Corrupt — start fresh
    await db.platformSetting.update({
      where: { setting_key: key },
      data: {
        setting_value: JSON.stringify({
          count: 1,
          firstAttemptAt: now.toISOString(),
        } satisfies RateLimitRecord),
      },
    });
    return;
  }

  const firstAttemptAt = new Date(data.firstAttemptAt);
  const elapsedMs = now.getTime() - firstAttemptAt.getTime();

  // If window expired, reset counter
  if (elapsedMs > windowMs) {
    await db.platformSetting.update({
      where: { setting_key: key },
      data: {
        setting_value: JSON.stringify({
          count: 1,
          firstAttemptAt: now.toISOString(),
        } satisfies RateLimitRecord),
      },
    });
    return;
  }

  // Increment counter
  await db.platformSetting.update({
    where: { setting_key: key },
    data: {
      setting_value: JSON.stringify({
        count: data.count + 1,
        firstAttemptAt: data.firstAttemptAt,
      } satisfies RateLimitRecord),
    },
  });
}

/**
 * Clear rate limit for a specific action + identifier.
 * Useful when a user successfully logs in — clear their failed login attempts.
 */
export async function clearRateLimit(
  action: string,
  identifier: string
): Promise<void> {
  const key = `ratelimit_${action}_${identifier}`;
  await db.platformSetting.deleteMany({
    where: { setting_key: key },
  }).catch(() => {}); // Ignore errors if key doesn't exist
}

/**
 * Extract client IP address from a request.
 * Falls back to "unknown" if IP can't be determined.
 */
export function getClientIp(request: Request): string {
  // Check common headers (Vercel, Cloudflare, etc.)
  const headers = new Headers(request.headers);
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-client-ip") ||
    "unknown"
  );
}
