import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Server-side superadmin email
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP code are required" },
        { status: 400 }
      );
    }

    // Verify email matches superadmin
    if (!SUPERADMIN_EMAIL || email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
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
        { error: "No OTP found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check expiry
    const expiresAt = new Date(expiryRecord.setting_value);
    if (new Date() > expiresAt) {
      // Clean up expired OTP
      await db.platformSetting.deleteMany({
        where: { setting_key: { in: ["superadmin_otp_code", "superadmin_otp_expires"] } },
      });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 401 }
      );
    }

    // Verify OTP
    if (otp !== otpRecord.setting_value) {
      return NextResponse.json(
        { error: "Invalid OTP code" },
        { status: 401 }
      );
    }

    // OTP verified — clean up
    await db.platformSetting.deleteMany({
      where: { setting_key: { in: ["superadmin_otp_code", "superadmin_otp_expires"] } },
    });

    // Check if the user is already signed in (step 1 was done)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Please complete step 1 (credentials) first" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
