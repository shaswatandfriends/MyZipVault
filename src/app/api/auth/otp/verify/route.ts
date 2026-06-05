import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

// Server-side superadmin email — never exposed to the client
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * POST /api/auth/otp/verify
 *
 * Pre-verifies the 6-digit OTP for superadmin login.
 * Does NOT delete the OTP — the NextAuth authorize() function
 * will validate it one final time and then clean it up.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { otp } = body;

    if (!otp) {
      return NextResponse.json(
        { error: "OTP code is required" },
        { status: 400 }
      );
    }

    if (!SUPERADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Unable to verify code" },
        { status: 500 }
      );
    }

    const otpRecord = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_code" },
    });

    const expiryRecord = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_expires" },
    });

    if (!otpRecord?.setting_value || !expiryRecord?.setting_value) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    const expiresAt = new Date(expiryRecord.setting_value);
    if (new Date() > expiresAt) {
      await db.platformSetting.deleteMany({
        where: { setting_key: { in: ["superadmin_otp_code", "superadmin_otp_expires", "superadmin_otp_sent_at"] } },
      });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 401 }
      );
    }

    // Timing-safe OTP verification
    if (!timingSafeEqual(String(otp), otpRecord.setting_value)) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: SUPERADMIN_EMAIL },
    });

    if (!user || user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Unable to verify code" },
        { status: 400 }
      );
    }

    if (user.accountStatus === "suspended" || user.accountStatus === "deleted" || user.accountStatus === "suspended_deleting") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    console.log(`[AUDIT] OTP pre-verified for superadmin — user: ${user.id}, timestamp: ${new Date().toISOString()}`);

    // Do NOT return the OTP code in the response
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("[OTP VERIFY] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
