import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    const { newPassword } = body as { newPassword: string };

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

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

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedPassword,
        plain_password: newPassword,
        must_change_pass: true,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_SKILLCHECKLIST_RECRUITER_RESET_PASSWORD]", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
