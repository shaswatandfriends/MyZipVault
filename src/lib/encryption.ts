import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";

/**
 * Resolve the encryption key from the environment.
 *
 * SECURITY: This MUST come from process.env.ENCRYPTION_KEY. There is NO
 * fallback default. If the env var is missing or invalid, encrypt/decrypt
 * will throw — this is intentional (fail closed) so we never silently
 * encrypt PHI with a publicly-known key.
 *
 * The key must be exactly 32 bytes (256 bits) for AES-256-CBC.
 */
function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error(
      "[SECURITY] ENCRYPTION_KEY environment variable is not set. " +
      "Refusing to encrypt/decrypt without a proper key. " +
      "Set a 32-byte key in your environment."
    );
  }
  if (envKey.length < 32) {
    throw new Error(
      `[SECURITY] ENCRYPTION_KEY must be at least 32 bytes (got ${envKey.length}). ` +
      "Refusing to encrypt/decrypt with a weak key."
    );
  }
  // Use only the first 32 bytes — supports keys longer than 32 bytes too
  return Buffer.from(envKey.slice(0, 32), "utf8");
}

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted text format — expected 'ivHex:encryptedHex'");
  }
  const iv = Buffer.from(ivHex, "hex");
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskValue(value: string): string {
  if (value.length <= 7) return "***";
  return `${value.slice(0, 3)}***${value.slice(-4)}`;
}
