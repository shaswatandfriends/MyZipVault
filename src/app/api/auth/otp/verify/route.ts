import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Server-side superadmin email — never exposed to the client
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

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

    // Verify superadmin email is configured
    if (!SUPERADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Super admin login is not configured" },
        { status: 500 }
      );
    }

    // Fetch stored OTP and expiry
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

    // Check expiry
    const expiresAt = new Date(expiryRecord.setting_value);
    if (new Date() > expiresAt) {
      // Clean up expired OTP
      await db.platformSetting.deleteMany({
        where: { setting_key: { in: ["superadmin_otp_code", "superadmin_otp_expires", "superadmin_otp_sent_at"] } },
      });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 401 }
      );
    }

    // Verify OTP
    if (otp !== otpRecord.setting_value) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    // Verify the user still exists and is active
    const user = await db.user.findUnique({
      where: { email: SUPERADMIN_EMAIL },
    });

    if (!user || user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Super admin account not found" },
        { status: 404 }
      );
    }

    if (user.accountStatus === "suspended" || user.accountStatus === "deleted" || user.accountStatus === "suspended_deleting") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // Pre-verification passed — do NOT delete OTP yet
    // The NextAuth authorize() function will validate it again and clean up

    console.log(`[AUDIT] OTP pre-verified for superadmin — user: ${user.id}, email: ${SUPERADMIN_EMAIL}, timestamp: ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      verifiedOtp: otp,
    });
  } catch (error) {
    console.error("[OTP VERIFY] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
