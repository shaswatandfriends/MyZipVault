import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export interface SessionUser {
  id: number;
  email: string;
  role: string;
  organizationId: number | null;
  isApproved: boolean;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Get the authenticated user from the session, with a DB fallback for
 * organizationId.
 *
 * WHY THIS EXISTS:
 *   The JWT session sometimes loses `organizationId` due to:
 *     - Stale JWT from before the org ID was added to the token
 *     - 5-minute refresh callback failing silently
 *     - Session cookie expiration
 *
 *   Previously, every API route returned 400 if `organizationId` was
 *   missing from the session. This caused recurring "Failed to load
 *   dashboard" errors that required the user to log out and back in.
 *
 *   This helper falls back to a DB lookup if `organizationId` is missing,
 *   making the system resilient to stale JWTs. The user never sees a 400
 *   just because their JWT is slightly out of date.
 *
 * @returns The session user with a valid organizationId (or null if truly
 *          no org exists), or null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const raw = session.user as Record<string, unknown>;
  let userId: number;
  try {
    userId = Number(raw.id);
  } catch {
    return null;
  }
  if (!userId || isNaN(userId)) return null;

  let organizationId = (raw.organizationId as number | null) ?? null;

  // ─── DB fallback: if organizationId is missing from session, look it up ───
  // This handles stale JWTs where the org ID wasn't set or was lost.
  if (!organizationId) {
    try {
      const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: { organization_id: true },
      });
      if (dbUser?.organization_id) {
        organizationId = dbUser.organization_id;
      }
    } catch {
      // DB lookup failed — return what we have (null orgId)
    }
  }

  return {
    id: userId,
    email: (raw.email as string) || "",
    role: (raw.role as string) || "",
    organizationId,
    isApproved: (raw.isApproved as boolean) ?? false,
    firstName: (raw.firstName as string) || null,
    lastName: (raw.lastName as string) || null,
  };
}
