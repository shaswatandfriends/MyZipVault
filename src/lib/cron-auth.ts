import { NextResponse } from "next/server";

/**
 * Verify the cron request is authorized.
 *
 * Supports two auth methods:
 *   1. `x-cron-secret` header matching process.env.CRON_SECRET
 *   2. `authorization: Bearer <secret>` header (Vercel Cron format)
 *
 * SECURITY: Fails CLOSED if CRON_SECRET is not set in the environment.
 *   This prevents cron endpoints from being accidentally left open in
 *   any environment (preview deploys, local dev, etc.).
 *
 * Usage:
 *   export async function GET(request: Request) {
 *     const authError = verifyCronAuth(request);
 *     if (authError) return authError;
 *     // ... cron logic
 *   }
 *
 * Returns:
 *   - null if authorized
 *   - NextResponse with 401 or 503 if not authorized
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed — if no secret configured, deny all access
  if (!cronSecret) {
    console.error(
      "[CRON] CRON_SECRET not configured — denying access. Set CRON_SECRET in environment variables."
    );
    return NextResponse.json(
      { error: "Server misconfigured — cron secret not set" },
      { status: 503 }
    );
  }

  // Check x-cron-secret header (custom format)
  const providedSecret = request.headers.get("x-cron-secret");

  // Check Authorization: Bearer <secret> header (Vercel Cron format)
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (providedSecret !== cronSecret && bearerToken !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // Authorized
}
