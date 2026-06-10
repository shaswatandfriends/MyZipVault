import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
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

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow toggling for recruiter/client_admin roles
    if (user.role !== "client_recruiter" && user.role !== "client_admin") {
      return NextResponse.json(
        { error: "Cannot toggle status for this user type" },
        { status: 403 }
      );
    }

    const newStatus = user.account_status === "active" ? "suspended" : "active";

    await db.user.update({
      where: { id: userId },
      data: { account_status: newStatus },
    });

    // Audit log
    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: userRole,
        action: newStatus === "suspended" ? "suspend_recruiter" : "activate_recruiter",
        entity_type: "user",
        entity_id: userId,
      },
    });

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    console.error("[SUPERADMIN_SKILLCHECKLIST_RECRUITER_TOGGLE_STATUS]", error);
    return NextResponse.json(
      { error: "Failed to toggle status" },
      { status: 500 }
    );
  }
}
