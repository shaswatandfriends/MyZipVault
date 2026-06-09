import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/lib/otp-email";

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);

    // Generate 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    // Hash with bcrypt (cost 10)
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const otpData = JSON.stringify({
      otp: hashedOtp,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    });

    // Store in platform_settings
    await db.platformSetting.upsert({
      where: { setting_key: "delete_skills_otp" },
      update: {
        setting_value: otpData,
        updated_by: userId,
      },
      create: {
        setting_key: "delete_skills_otp",
        setting_value: otpData,
        updated_by: userId,
      },
    });

    // Send email to super admin
    const targetEmail = SUPERADMIN_EMAIL || ((session.user as Record<string, unknown>).email as string);
    const emailSent = await sendOtpEmail(targetEmail, otpCode);

    if (!emailSent) {
      console.warn("[DELETE_OTP] Email may not have been sent, but OTP was generated");
    }

    return NextResponse.json({
      sent: true,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("[REQUEST_DELETE_OTP_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
