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
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a random hashed password — user must use forgot-password flow to set their own
    const hashedPassword = await hash(randomBytes(16).toString("hex"), 12);

    await db.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedPassword,
        must_change_pass: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset. User must use the forgot-password flow to set a new one.",
    });
  } catch (error) {
    console.error("[ADMIN_USER_RESET_PASSWORD]", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
