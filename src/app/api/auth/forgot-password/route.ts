import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, recordRateLimitAttempt, getClientIp } from "@/lib/rate-limiter";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * POST /api/auth/forgot-password
 *
 * Generates a password reset token and emails a reset link.
 * Always returns success to avoid revealing whether an email is registered.
 *
 * Rate limited: max 5 requests per email per hour, max 10 per IP per hour.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ─── Gap 9: Rate limit password reset requests ───
    // Max 5 per email per hour + max 10 per IP per hour
    const clientIp = getClientIp(request);
    const [emailLimit, ipLimit] = await Promise.all([
      checkRateLimit("forgot_password", normalizedEmail, 5, 3600),
      checkRateLimit("forgot_password_ip", clientIp, 10, 3600),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
      // Still return success to avoid revealing whether email is registered
      return NextResponse.json({ success: true });
    }

    // Record both rate limit attempts
    await Promise.all([
      recordRateLimitAttempt("forgot_password", normalizedEmail, 3600),
      recordRateLimitAttempt("forgot_password_ip", clientIp, 3600),
    ]);

    // Look up the user — but do NOT reveal whether they exist
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Check account status — don't send reset for suspended/deleted accounts
      const isSuspended = ["suspended", "deleted", "suspended_deleting"].includes(
        user.account_status
      );

      if (!isSuspended) {
        // Generate a secure random token
        const token = crypto.randomBytes(32).toString("hex");

        // Store token in PlatformSetting with 1-hour expiry
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        // Store the token + expiry + user association
        await db.platformSetting.upsert({
          where: { setting_key: `reset_${token}` },
          update: {
            setting_value: JSON.stringify({
              userId: user.id,
              email: user.email,
              expiresAt,
            }),
          },
          create: {
            setting_key: `reset_${token}`,
            setting_value: JSON.stringify({
              userId: user.id,
              email: user.email,
              expiresAt,
            }),
          },
        });

        // Send the reset email
        const resetLink = `${BASE_URL}/reset-password?token=${token}`;

        try {
          await sendPasswordResetEmail(user.email, resetLink);
          console.log(`[AUDIT] Password reset email sent — user: ${user.id}, email: ${user.email}, timestamp: ${new Date().toISOString()}`);
        } catch (emailError) {
          console.error("[FORGOT PASSWORD] Failed to send reset email:", emailError);
          // Clean up the token since email failed
          await db.platformSetting.deleteMany({
            where: { setting_key: `reset_${token}` },
          });
        }
      }
    }

    // Always return success — don't reveal if email exists
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a reset link.",
    });
  } catch (error) {
    console.error("[FORGOT PASSWORD] Error:", error);
    // Still return success to avoid leaking information
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a reset link.",
    });
  }
}
