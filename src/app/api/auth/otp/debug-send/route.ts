import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/otp-email";

/**
 * POST /api/auth/otp/debug-send?secret=XXX
 *
 * TEMPORARY DEBUG ENDPOINT — generates a fresh OTP, stores it in DB,
 * sends the email, AND returns the OTP in the HTTP response so we can
 * verify the email content matches the DB content.
 *
 * Protected by a hardcoded debug secret to prevent public abuse.
 *
 * ⚠️ REMOVE THIS ENDPOINT BEFORE PRODUCTION GO-LIVE.
 *
 * Usage:
 *   curl -X POST "https://my-zip-vault.vercel.app/api/auth/otp/debug-send?secret=mzv-debug-2026"
 *   → returns { success: true, otp: "123456", email: "...", db_otp: "123456" }
 */
const DEBUG_SECRET = "mzv-debug-2026";

export async function POST(request: NextRequest) {
  try {
    // Verify debug secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (secret !== DEBUG_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";
    if (!SUPERADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        step: "env_check",
        error: "SUPERADMIN_EMAIL env var is not set on Vercel",
        env_var_value: "(empty)",
      }, { status: 500 });
    }

    // Find the superadmin user
    const user = await db.user.findFirst({
      where: {
        email: { equals: SUPERADMIN_EMAIL, mode: "insensitive" },
        role: "super_admin",
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        step: "user_lookup",
        error: "No super_admin user found with the configured email",
        superadmin_email_env: SUPERADMIN_EMAIL,
        db_users_with_super_admin_role: await db.user.count({ where: { role: "super_admin" } }),
      }, { status: 400 });
    }

    // Generate a fresh OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store in DB (upsert — overwrites any previous OTP)
    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_code" },
      update: { setting_value: otp, updated_by: user.id },
      create: { setting_key: "superadmin_otp_code", setting_value: otp, updated_by: user.id },
    });

    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_expires" },
      update: { setting_value: expiresAt, updated_by: user.id },
      create: { setting_key: "superadmin_otp_expires", setting_value: expiresAt, updated_by: user.id },
    });

    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_sent_at" },
      update: { setting_value: new Date().toISOString(), updated_by: user.id },
      create: { setting_key: "superadmin_otp_sent_at", setting_value: new Date().toISOString(), updated_by: user.id },
    });

    // Send the email
    const emailSent = await sendOtpEmail(SUPERADMIN_EMAIL, otp);

    // Read back from DB to confirm what's stored
    const dbOtpRecord = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_code" },
    });

    return NextResponse.json({
      success: true,
      debug: true,
      generated_otp: otp,
      db_otp_after_write: dbOtpRecord?.setting_value,
      db_otp_matches_generated: dbOtpRecord?.setting_value === otp,
      email_sent: emailSent,
      email_address: SUPERADMIN_EMAIL,
      user_id: user.id,
      user_role: user.role,
      user_account_status: user.account_status,
      expires_at: expiresAt,
      instructions: "Use the 'generated_otp' value above in the superadmin login form within 5 minutes.",
    });
  } catch (error: any) {
    console.error("[OTP DEBUG SEND] Error:", error);
    return NextResponse.json({
      success: false,
      step: "exception",
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
    }, { status: 500 });
  }
}
