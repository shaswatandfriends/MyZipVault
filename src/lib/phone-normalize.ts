/**
 * Phone + email normalization utilities for the marketplace.
 *
 * These are used for:
 *   1. Deduplication — two candidates with the same normalized email/phone
 *      are the same person.
 *   2. Consistent storage — the display value can be in any format, but the
 *      normalized value is always the same.
 *
 * Phone normalization:
 *   - Strips all non-digit characters
 *   - Converts to E.164 format: +1XXXXXXXXXX (US only for now)
 *   - Returns null for invalid input
 *
 * Email normalization:
 *   - Lowercase
 *   - Trim whitespace
 *   - Strip Gmail "+aliases" (john+job@gmail.com → john@gmail.com)
 *   - Strip Gmail dots in username (j.o.h.n@gmail.com → john@gmail.com)
 *   - Returns null for invalid input
 *
 * Usage:
 *   import { normalizePhone, normalizeEmail, formatPhoneDisplay } from "@/lib/phone-normalize";
 *
 *   const normalized = normalizePhone("+1 (555) 123-4567");  // "+15551234567"
 *   const display = formatPhoneDisplay("+15551234567");        // "+1 (555) 123-4567"
 */

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US).
 *
 * Accepts inputs like:
 *   - "+1 (555) 123-4567"
 *   - "555-123-4567"
 *   - "(555) 123-4567"
 *   - "5551234567"
 *   - "+1 555 123 4567"
 *
 * Returns "+15551234567" or null if invalid.
 *
 * NOTE: Currently US-only. For international support, integrate a library
 * like libphonenumber-js (https://github.com/catamphetamine/libphonenumber-js).
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Strip all non-digit characters (keep leading + if present)
  const cleaned = input.trim().replace(/[^\d+]/g, "");

  // Handle empty after cleaning
  if (!cleaned || cleaned === "+") return null;

  let digits: string;

  if (cleaned.startsWith("+")) {
    // Already has country code — strip the + and use as-is
    digits = cleaned.substring(1);
  } else if (cleaned.length === 10) {
    // US 10-digit number without country code — prepend 1
    digits = "1" + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
    // US 11-digit number starting with 1 — use as-is
    digits = cleaned;
  } else {
    // Unknown format — return null (could extend for intl later)
    return null;
  }

  // Validate US number: country code 1, then 10 digits
  if (!/^1\d{10}$/.test(digits)) {
    return null;
  }

  return "+" + digits;
}

/**
 * Format a normalized phone number for display.
 *
 * Input must be in E.164 format (+1XXXXXXXXXX).
 * Output: "+1 (XXX) XXX-XXXX"
 *
 * Returns the input unchanged if it doesn't match the expected format.
 */
export function formatPhoneDisplay(normalized: string | null | undefined): string {
  if (!normalized) return "";

  // Match +1 followed by 10 digits
  const match = normalized.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!match) return normalized;

  return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
}

/**
 * Check if a phone number is already in normalized E.164 format.
 */
export function isPhoneNormalized(input: string): boolean {
  return /^\+1\d{10}$/.test(input);
}

/**
 * Normalize an email address for deduplication.
 *
 * - Lowercase
 * - Trim whitespace
 * - Strip Gmail "+aliases" (john+job@gmail.com → john@gmail.com)
 * - Strip Gmail dots in username (j.o.h.n@gmail.com → john@gmail.com)
 *   (Gmail ignores dots; other providers do not)
 *
 * Returns the normalized email or null if input is empty.
 */
export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;

  let email = input.trim().toLowerCase();

  if (!email) return null;

  // Split into local and domain parts
  const atIdx = email.lastIndexOf("@");
  if (atIdx === -1 || atIdx === 0 || atIdx === email.length - 1) {
    // Invalid email format — return as-is (let Zod validation catch it)
    return email;
  }

  let local = email.substring(0, atIdx);
  const domain = email.substring(atIdx + 1);

  // Strip "+aliases" from local part (works for all providers)
  const plusIdx = local.indexOf("+");
  if (plusIdx !== -1) {
    local = local.substring(0, plusIdx);
  }

  // Strip dots from local part — ONLY for Gmail (Googlemail too)
  // Other providers treat dots as significant.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

/**
 * Check if an email looks valid (basic format check — not full RFC 5322).
 *
 * Used for early rejection before Zod validation.
 */
export function isEmailValid(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Check if a phone number looks like a valid US number (10 or 11 digits).
 *
 * Used for early rejection before normalization.
 */
export function isPhoneValid(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned || cleaned === "+") return false;

  let digits: string;
  if (cleaned.startsWith("+")) {
    digits = cleaned.substring(1);
    return /^\d{11}$/.test(digits) && digits.startsWith("1");
  }

  return /^\d{10}$/.test(cleaned) || (/^\d{11}$/.test(cleaned) && cleaned.startsWith("1"));
}

/**
 * Combined dedup check for a candidate.
 *
 * Given an email and phone (either may be null), return normalized values
 * for both. If either fails normalization, return null for that field
 * (the caller can decide whether to reject or proceed).
 *
 * Usage:
 *   const { email, phone } = normalizeContactForDedup(rawEmail, rawPhone);
 *   if (!email && !phone) {
 *     // No valid contact info — can't dedup, treat as new
 *   } else {
 *     // Query CandidateContactInfo where value_normalized IN [email, phone]
 *   }
 */
export function normalizeContactForDedup(
  rawEmail: string | null | undefined,
  rawPhone: string | null | undefined
): { email: string | null; phone: string | null } {
  return {
    email: normalizeEmail(rawEmail),
    phone: normalizePhone(rawPhone),
  };
}
