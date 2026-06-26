import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { generateSecurePassword } from "@/lib/password-generator";

/**
 * POST /api/superadmin/companies/[id]/reset-admin-password
 *
 * Admin-initiated password reset for a client_admin or client_recruiter.
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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const body = await request.json();
    const { userId, newPassword } = body as { userId?: number; newPassword?: string };

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify the user belongs to this organization
    const user = await db.user.findFirst({
      where: {
        id: userId,
        organization_id: companyId,
        role: { in: ["client_admin", "client_recruiter"] },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in this organization" },
        { status: 404 }
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

    const passwordHash = await hash(finalPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
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
        role: "super_admin",
        action: "reset_admin_password",
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
    console.error("[SUPERADMIN_RESET_ADMIN_PASSWORD_POST]", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
