import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Result of an email verification check.
 */
interface VerificationCheckResult {
  /** true if the user is allowed to perform the action */
  allowed: boolean;
  /** NextResponse to return if not allowed (null if allowed) */
  errorResponse: NextResponse | null;
}

/**
 * Verify the user has confirmed their email address.
 *
 * Per Gap 5 fix: unverified users can log in but have LIMITED functionality.
 * They CAN: view dashboard, edit profile, upload resume (but not share it)
 * They CANNOT: upload credentials, share documents, submit checklists,
 *              request references
 *
 * Usage in API routes:
 *   const check = await requireEmailVerified(userId);
 *   if (!check.allowed) return check.errorResponse;
 *
 * @param userId - The user's ID
 * @returns { allowed, errorResponse }
 */
export async function requireEmailVerified(
  userId: number
): Promise<VerificationCheckResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email_verified_at: true, role: true },
  });

  if (!user) {
    return {
      allowed: false,
      errorResponse: NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      ),
    };
  }

  // Super admins use OTP login — they don't need email verification
  if (user.role === "super_admin") {
    return { allowed: true, errorResponse: null };
  }

  // If email is verified, allow
  if (user.email_verified_at) {
    return { allowed: true, errorResponse: null };
  }

  // Not verified — block the action
  return {
    allowed: false,
    errorResponse: NextResponse.json(
      {
        error: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email address to perform this action. Check your inbox for the verification link, or request a new one from your dashboard.",
      },
      { status: 403 }
    ),
  };
}
