import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/auth/verify-email
 *
 * Verifies an email verification token. If valid, marks the user's
 * email_verified_at and deletes the token.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Look up the token in PlatformSetting
    const setting = await db.platformSetting.findUnique({
      where: { setting_key: `verify_${token}` },
    });

    if (!setting) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Parse the stored token data
    let tokenData: { userId: number; email: string; expiresAt: string };
    try {
      tokenData = JSON.parse(setting.setting_value);
    } catch {
      return NextResponse.json(
        { error: "Invalid verification token data" },
        { status: 400 }
      );
    }

    // Check expiry (24 hours)
    const expiresAt = new Date(tokenData.expiresAt);
    if (new Date() > expiresAt) {
      // Clean up expired token
      await db.platformSetting.deleteMany({
        where: { setting_key: `verify_${token}` },
      });
      return NextResponse.json(
        { error: "Verification token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify the user exists and matches
    const user = await db.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user || user.email !== tokenData.email) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Already verified?
    if (user.email_verified_at) {
      // Clean up the token
      await db.platformSetting.deleteMany({
        where: { setting_key: `verify_${token}` },
      });
      return NextResponse.json({
        success: true,
        message: "Email is already verified.",
      });
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: { email_verified_at: new Date() },
    });

    // Delete the used token
    await db.platformSetting.deleteMany({
      where: { setting_key: `verify_${token}` },
    });

    console.log(
      `[AUDIT] Email verified — user: ${user.id}, email: ${user.email}, timestamp: ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    console.error("[VERIFY EMAIL] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify email. Please try again." },
      { status: 500 }
    );
  }
}
