import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
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
    const adminId = parseInt(id);

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (!["platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "User is not a pending admin" }, { status: 400 });
    }

    // Approve the admin account
    await db.user.update({
      where: { id: adminId },
      data: { is_approved: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_ADMIN_APPROVE]", error);
    return NextResponse.json(
      { error: "Failed to approve admin" },
      { status: 500 }
    );
  }
}
