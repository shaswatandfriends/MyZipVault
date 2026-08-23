import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/otp-email";

// Server-side superadmin email — never exposed to the client
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

/**
 * POST /api/auth/otp/send
 *
 * Sends a 6-digit OTP to the configured superadmin email.
 * No password required — OTP is the sole authentication method.
 *
 * Security:
 * - Only the env-configured SUPERADMIN_EMAIL can receive an OTP
 * - Rate-limited by server-side 60-second cooldown + OTP expiry (5 min)
 * - No hourly cap (removed per user instruction — 60s cooldown is the sole limit)
 * - Previous OTPs are overwritten (only one valid OTP at a time)
 */
export async function POST() {
  try {
    // Verify the superadmin email is configured
    if (!SUPERADMIN_EMAIL) {
      console.error("[OTP SEND] SUPERADMIN_EMAIL not configured");
      return NextResponse.json(
        { error: "Super admin login is not configured" },
        { status: 500 }
      );
    }

    // Verify the superadmin user exists in the database (case-insensitive)
    const user = await db.user.findFirst({
      where: { email: { equals: SUPERADMIN_EMAIL, mode: "insensitive" } },
    });

    if (!user) {
      console.error("[OTP SEND] No user found with email:", SUPERADMIN_EMAIL);
      return NextResponse.json(
        { error: "Unable to send verification code — user not found. Check SUPERADMIN_EMAIL env var." },
        { status: 400 }
      );
    }

    if (user.role !== "super_admin") {
      console.error("[OTP SEND] User found but role is:", user.role, "(expected super_admin)");
      return NextResponse.json(
        { error: "Unable to send verification code — user is not a super admin." },
        { status: 400 }
      );
    }

    // Check account status
    if (user.account_status === "suspended" || user.account_status === "deleted" || user.account_status === "suspended_deleting") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // Rate limit: check if an OTP was recently sent (within last 60 seconds)
    const recentOtp = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_sent_at" },
    });

    if (recentOtp?.setting_value) {
      const lastSentAt = new Date(recentOtp.setting_value);
      const secondsSinceLastSent = (Date.now() - lastSentAt.getTime()) / 1000;
      if (secondsSinceLastSent < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastSent);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code`, cooldown: waitSeconds },
          { status: 429 }
        );
      }
    }

    // Rate limit policy: 60-second cooldown between OTP requests only.
    // No hourly cap — user explicitly requested 60-second cooldown as the sole limit.
    // (Previous 5-per-hour cap was removed per user instruction.)

    // Generate a 6-digit OTP using crypto.randomInt for cryptographic randomness
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Store OTP in platform_settings with expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_code" },
      update: {
        setting_value: otp,
        updated_by: user.id,
      },
      create: {
        setting_key: "superadmin_otp_code",
        setting_value: otp,
        updated_by: user.id,
      },
    });

    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_expires" },
      update: {
        setting_value: expiresAt,
        updated_by: user.id,
      },
      create: {
        setting_key: "superadmin_otp_expires",
        setting_value: expiresAt,
        updated_by: user.id,
      },
    });

    // Record when OTP was sent (for server-side rate limiting)
    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_sent_at" },
      update: {
        setting_value: new Date().toISOString(),
        updated_by: user.id,
      },
      create: {
        setting_key: "superadmin_otp_sent_at",
        setting_value: new Date().toISOString(),
        updated_by: user.id,
      },
    });

    // Note: Previously tracked `superadmin_otp_request_count` and `superadmin_otp_count_reset_at`
    // for a 5-per-hour cap. These settings are no longer read or written.
    // Existing rows in `platform_settings` are left as-is (no destructive cleanup).

    // Try to send OTP via email
    const emailSent = await sendOtpEmail(SUPERADMIN_EMAIL, otp);

    if (!emailSent) {
      // Email delivery failed — log the OTP for server-side recovery (Vercel logs)
      // The superadmin can check server logs to retrieve the code.
      // This is safe because only the Vercel project owner can view function logs.
      console.warn(`[OTP SEND] Email delivery failed — OTP code for recovery: ${otp} — user: ${user.id}`);
      console.log(`[AUDIT] OTP generated but email not delivered — user: ${user.id}, email: ${SUPERADMIN_EMAIL}, timestamp: ${new Date().toISOString()}`);
    } else {
      console.log(`[AUDIT] OTP sent to superadmin — user: ${user.id}, email: ${SUPERADMIN_EMAIL}, timestamp: ${new Date().toISOString()}`);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Verification code sent to your email address"
        : "Verification code generated. Check server logs if email not received.",
      expiresAt,
    });
  } catch (error) {
    console.error("[OTP SEND] Error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please check if the service is properly configured." },
      { status: 500 }
    );
  }
}
