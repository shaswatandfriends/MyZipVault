import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema, validateBody } from "@/lib/validation-schemas";

/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and updates the user's password.
 *
 * Uses the shared Zod `resetPasswordSchema` which enforces:
 *   - token: required string
 *   - password: 8–128 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Zod validation (replaces the old manual length-only check) ──
    // Note: the page sends `password`, not `newPassword` — keep the
    // schema field name aligned with the request body.
    const schema = resetPasswordSchema.extend({
      password: resetPasswordSchema.shape.password,
    });
    const validation = validateBody(schema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { token, password: newPassword } = validation.data;

    // Look up the token in PlatformSetting
    const tokenRecord = await db.platformSetting.findUnique({
      where: { setting_key: `reset_${token}` },
    });

    if (!tokenRecord?.setting_value) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset link." },
        { status: 400 }
      );
    }

    // Parse the stored token data
    let tokenData: { userId: number; email: string; expiresAt: string };
    try {
      tokenData = JSON.parse(tokenRecord.setting_value);
    } catch {
      return NextResponse.json(
        { error: "Invalid reset token data. Please request a new password reset link." },
        { status: 400 }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expiresAt);
    if (new Date() > expiresAt) {
      // Clean up expired token
      await db.platformSetting.deleteMany({
        where: { setting_key: `reset_${token}` },
      });
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new password reset link." },
        { status: 400 }
      );
    }

    // Verify the user still exists
    const user = await db.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      // Clean up token for non-existent user
      await db.platformSetting.deleteMany({
        where: { setting_key: `reset_${token}` },
      });
      return NextResponse.json(
        { error: "User account not found. Please request a new password reset link." },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12);

    // Update the user's password
    await db.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        must_change_pass: false,
      },
    });

    // Delete the used token
    await db.platformSetting.deleteMany({
      where: { setting_key: `reset_${token}` },
    });

    // Also delete any other reset tokens for this user (security: invalidate all outstanding resets)
    const allSettings = await db.platformSetting.findMany({
      where: {
        setting_key: { startsWith: "reset_" },
      },
    });

    for (const setting of allSettings) {
      try {
        const data = JSON.parse(setting.setting_value);
        if (data.userId === user.id && setting.setting_key !== `reset_${token}`) {
          await db.platformSetting.delete({
            where: { setting_key: setting.setting_key },
          });
        }
      } catch {
        // Skip malformed entries
      }
    }

    console.log(`[AUDIT] Password reset successful — user: ${user.id}, email: ${user.email}, timestamp: ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("[RESET PASSWORD] Error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
