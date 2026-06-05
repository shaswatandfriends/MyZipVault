import { NextResponse } from "next/server";
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
        { error: "Super admin account not found" },
        { status: 404 }
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

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

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

    // Try to send OTP via email
    const emailSent = await sendOtpEmail(SUPERADMIN_EMAIL, otp);

    if (!emailSent) {
      // Email failed but OTP is stored — log it for admin access via Vercel logs
      console.warn(`[OTP SEND] Email delivery failed — OTP code for ${SUPERADMIN_EMAIL}: ${otp}`);
      // Still return success so the user can enter the code (they can check Vercel logs)
      // This prevents blocking login entirely if Brevo has issues
      return NextResponse.json({
        success: true,
        message: "Verification code generated (check server logs if email not received)",
        expiresAt,
      });
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
