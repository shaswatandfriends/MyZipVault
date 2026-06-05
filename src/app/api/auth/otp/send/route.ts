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
 * - Rate-limited by client-side cooldown (60s) + OTP expiry (5 min)
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

    // Verify the superadmin user exists in the database
    const user = await db.user.findUnique({
      where: { email: SUPERADMIN_EMAIL },
    });

    if (!user || user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Unable to send verification code" },
        { status: 400 }
      );
    }

    // Check account status
    if (user.accountStatus === "suspended" || user.accountStatus === "deleted" || user.accountStatus === "suspended_deleting") {
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

    // Max OTP requests: limit to 5 per hour to prevent abuse
    const otpCountRecord = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_request_count" },
    });
    const otpCountResetRecord = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_count_reset_at" },
    });

    let otpCount = 0;
    let countResetAt = otpCountResetRecord ? new Date(otpCountResetRecord.setting_value) : new Date();

    if (otpCountRecord?.setting_value) {
      // Reset counter if more than 1 hour has passed
      if (Date.now() - countResetAt.getTime() > 60 * 60 * 1000) {
        otpCount = 0;
        countResetAt = new Date();
      } else {
        otpCount = parseInt(otpCountRecord.setting_value, 10) || 0;
      }
    }

    if (otpCount >= 5) {
      return NextResponse.json(
        { error: "Too many verification code requests. Please try again later." },
        { status: 429 }
      );
    }

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

    // Increment OTP request counter
    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_request_count" },
      update: { setting_value: String(otpCount + 1), updated_by: user.id },
      create: { setting_key: "superadmin_otp_request_count", setting_value: "1", updated_by: user.id },
    });
    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_count_reset_at" },
      update: { setting_value: countResetAt.toISOString(), updated_by: user.id },
      create: { setting_key: "superadmin_otp_count_reset_at", setting_value: countResetAt.toISOString(), updated_by: user.id },
    });

    // Try to send OTP via email
    const emailSent = await sendOtpEmail(SUPERADMIN_EMAIL, otp);

    if (!emailSent) {
      // Email failed — do NOT log the OTP code
      console.warn(`[OTP SEND] Email delivery failed for superadmin user: ${user.id}`);
      // Clean up the OTP so it can't be used without email delivery
      await db.platformSetting.deleteMany({
        where: { setting_key: { in: ["superadmin_otp_code", "superadmin_otp_expires", "superadmin_otp_sent_at"] } },
      });
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }

    console.log(`[AUDIT] OTP sent to superadmin — user: ${user.id}, email: ${SUPERADMIN_EMAIL}, timestamp: ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email address",
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
