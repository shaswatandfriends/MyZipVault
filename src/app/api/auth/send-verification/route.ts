import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * POST /api/auth/send-verification
 *
 * Generates an email verification token and sends a verification link.
 * Always returns success to avoid revealing whether an email is registered.
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

    // Look up the user — but do NOT reveal whether they exist
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Only send if email is not yet verified
      if (!user.email_verified_at) {
        // Check account status — don't send for suspended/deleted accounts
        const isSuspended = [
          "suspended",
          "deleted",
          "suspended_deleting",
        ].includes(user.account_status);

        if (!isSuspended) {
          // Generate a secure random token
          const token = crypto.randomBytes(32).toString("hex");

          // Store token in PlatformSetting with 24-hour expiry
          const expiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString();

          await db.platformSetting.upsert({
            where: { setting_key: `verify_${token}` },
            update: {
              setting_value: JSON.stringify({
                userId: user.id,
                email: user.email,
                expiresAt,
              }),
            },
            create: {
              setting_key: `verify_${token}`,
              setting_value: JSON.stringify({
                userId: user.id,
                email: user.email,
                expiresAt,
              }),
            },
          });

          // Send the verification email
          const verificationLink = `${BASE_URL}/verify-email?token=${token}`;

          try {
            await sendVerificationEmail(user.email, verificationLink);
            console.log(
              `[AUDIT] Verification email sent — user: ${user.id}, email: ${user.email}, timestamp: ${new Date().toISOString()}`
            );
          } catch (emailError) {
            console.error(
              "[SEND VERIFICATION] Failed to send verification email:",
              emailError
            );
            // Clean up the token since email failed
            await db.platformSetting.deleteMany({
              where: { setting_key: `verify_${token}` },
            });
          }
        }
      }
    }

    // Always return success — don't reveal if email exists
    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists and is not yet verified, we've sent a verification link.",
    });
  } catch (error) {
    console.error("[SEND VERIFICATION] Error:", error);
    // Still return success to avoid leaking information
    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists and is not yet verified, we've sent a verification link.",
    });
  }
}
