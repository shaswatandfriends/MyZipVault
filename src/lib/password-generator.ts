import crypto from "crypto";

/**
 * Cryptographically-secure random password generator.
 *
 * Uses Node's `crypto.randomBytes` (CSPRNG) — NEVER `Math.random()`.
 *
 * `Math.random()` is a PRNG seeded from a predictable source. With enough
 * observed outputs an attacker can reconstruct its internal state and
 * predict future passwords. CSPRNG output is suitable for auth secrets.
 */

/**
 * Generate a secure random password that always satisfies the Zod
 * `passwordSchema` rules: min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit.
 *
 * Format: `<8 random base64url chars> + <guaranteed Aa1! suffix>`
 * Total length: 12 chars. Entropy: ~48 bits from the random portion.
 *
 * Suitable for:
 *  - Admin-initiated password resets (returned ONCE in the API response,
 *    never stored in plaintext, forced `must_change_pass: true`).
 *  - New user auto-provisioning where an invite link will overwrite the
 *    password via the /onboard flow.
 */
export function generateSecurePassword(length = 12): string {
  // Clamp to a sane range
  const safeLength = Math.max(8, Math.min(64, length));
  // Generate enough random bytes (base64url is ~1.33x more efficient than hex)
  const randomPart = crypto
    .randomBytes(Math.ceil((safeLength - 4) * 0.75))
    .toString("base64url")
    .slice(0, safeLength - 4);
  // Guaranteed-complexity suffix ensures Zod schema passes
  return `${randomPart}Aa1!`;
}

/**
 * Generate a secure random placeholder password hash.
 *
 * Used when auto-provisioning a user that will set their real password
 * via an invite token flow (e.g., candidate created from recruiter
 * send-request, manager created from reference request).
 *
 * The returned value is a bcrypt hash of a random CSPRNG string — never
 * the plaintext. The plaintext is discarded immediately.
 */
export async function generatePlaceholderPasswordHash(): Promise<string> {
  const { hash } = await import("bcryptjs");
  const random = crypto.randomBytes(16).toString("base64url");
  return hash(random, 12);
}
