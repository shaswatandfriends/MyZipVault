import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

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

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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

    const passwordHash = await hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        plain_password: newPassword,
        must_change_pass: true,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_RESET_ADMIN_PASSWORD_POST]", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
