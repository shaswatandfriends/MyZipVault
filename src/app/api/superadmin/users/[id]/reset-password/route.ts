import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

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
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent resetting super_admin passwords unless you ARE a super_admin
    if (user.role === "super_admin" && userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can reset other super admin passwords" },
        { status: 403 }
      );
    }

    // Generate a temporary password
    const tempPassword = randomBytes(8).toString("hex");
    const hashedPassword = await hash(tempPassword, 12);
    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);

    // ─── Transactional password reset + audit log ────────────────────
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password_hash: hashedPassword,
          must_change_pass: true,
        },
      });

      await tx.auditLog.create({
        data: {
          user_id: actionerId,
          role: userRole,
          action: "reset_user_password",
          entity_type: "user",
          entity_id: userId,
          details: `Password reset for ${user.email}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      temporary_password: tempPassword,
    });
  } catch (error) {
    console.error("[SUPERADMIN_USER_RESET_PASSWORD]", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
