import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

/**
 * POST /api/auth/resend-verification
 *   Resends the email verification link to the logged-in user.
 *
 * Rate-limited to 1 resend per 60 seconds (stored in platform_settings).
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, email_verified_at: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Already verified
    if (user.email_verified_at || user.role === "super_admin") {
      return NextResponse.json({
        success: true,
        message: "Email already verified",
      });
    }

    // Rate limit: 1 resend per 60 seconds
    const lastResendKey = `verify_resend_${userId}`;
    const lastResend = await db.platformSetting.findUnique({
      where: { setting_key: lastResendKey },
    });

    if (lastResend?.setting_value) {
      const lastResendTime = new Date(lastResend.setting_value);
      const secondsSinceLastResend =
        (Date.now() - lastResendTime.getTime()) / 1000;
      if (secondsSinceLastResend < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastResend);
        return NextResponse.json(
          {
            error: `Please wait ${waitSeconds} seconds before requesting another verification email`,
            cooldown: waitSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Generate verification token (similar to password reset)
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store token
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

    // Update last resend timestamp
    await db.platformSetting.upsert({
      where: { setting_key: lastResendKey },
      update: { setting_value: new Date().toISOString() },
      create: {
        setting_key: lastResendKey,
        setting_value: new Date().toISOString(),
      },
    });

    // Build verification URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;

    // Send verification email
    await sendVerificationEmail(user.email, verificationLink);

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Check your inbox.",
    });
  } catch (error) {
    console.error("[RESEND_VERIFICATION]", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}
