import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { sendOtpEmail } from "@/lib/otp-email";

// Server-side superadmin email
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Only the configured superadmin email is allowed
    if (!SUPERADMIN_EMAIL || email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "This portal is for authorized super administrators only" },
        { status: 403 }
      );
    }

    // Verify user exists and is super_admin
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.accountStatus === "suspended" || user.accountStatus === "deleted") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
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

    // Send OTP via email
    await sendOtpEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email address",
      expiresAt,
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
