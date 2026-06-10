/**
 * Returns the base URL of the application.
 * Priority: NEXTAUTH_URL env var → VERCEL_URL → hardcoded fallback
 */
export function getAppUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://my-zip-vault.vercel.app";
}
