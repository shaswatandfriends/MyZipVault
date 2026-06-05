import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";
const DEFAULT_KEY = "myzipvault-encryption-key-32b!";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY === DEFAULT_KEY) {
  console.warn("[SECURITY] ENCRYPTION_KEY is not set or using the default value. Encrypted data is NOT secure. Set a strong 32-byte key in production.");
}

function getKey(): Buffer {
  const key = (ENCRYPTION_KEY || DEFAULT_KEY).padEnd(32, "0").slice(0, 32);
  return Buffer.from(key);
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
