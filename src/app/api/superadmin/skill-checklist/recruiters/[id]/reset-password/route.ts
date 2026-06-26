import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateSecurePassword } from "@/lib/password-generator";

/**
 * POST /api/superadmin/skill-checklist/recruiters/[id]/reset-password
 *
 * Admin-initiated password reset for a recruiter or client_admin.
 *
 * Security notes:
 *   - The new password is generated using `crypto.randomBytes` (CSPRNG),
 *     never `Math.random()`.
 *   - The plaintext is NOT stored anywhere — only the bcrypt hash is
 *     persisted. Previous versions stored the plaintext in a `plain_password`
 *     column; that practice has been removed.
 *   - The plaintext is returned ONCE in the API response so the admin
 *     can share it out-of-band (Slack, phone) with the user. The user
 *     is forced to change it on next login via `must_change_pass: true`.
 *   - An audit log entry is written.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    const body = await request.json();
    const { newPassword } = body as { newPassword?: string };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow password reset for recruiter/client_admin roles
    if (user.role !== "client_recruiter" && user.role !== "client_admin") {
      return NextResponse.json(
        { error: "Cannot reset password for this user type" },
        { status: 403 }
      );
    }

    // Use admin-supplied password if provided (must meet schema),
    // otherwise generate a cryptographically-secure one.
    let finalPassword: string;
    if (newPassword && newPassword.length >= 8) {
      finalPassword = newPassword;
    } else {
      finalPassword = generateSecurePassword(12);
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedPassword,
        must_change_pass: true,
        // NOTE: plain_password column is intentionally NOT written.
        // The column should be dropped from the DB in a follow-up migration.
      },
    });

    // Audit log
    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: userRole,
        action: "reset_recruiter_password",
        entity_type: "user",
        entity_id: userId,
      },
    });

    // Return the plaintext ONCE — admin must share it out-of-band.
    // It is never persisted to the database.
    return NextResponse.json({
      success: true,
      temporary_password: finalPassword,
      message: "Password reset. The user must change it on next login.",
    });
  } catch (error) {
    console.error("[SUPERADMIN_SKILLCHECKLIST_RECRUITER_RESET_PASSWORD]", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
