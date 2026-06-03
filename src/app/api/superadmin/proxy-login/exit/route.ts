import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number(session.user.id);

    // Log audit trail for exiting proxy
    await db.auditLog.create({
      data: {
        user_id: userId,
        role: userRole,
        action: "proxy_login_exit",
        entity_type: "user",
        entity_id: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_PROXY_LOGIN_EXIT]", error);
    return NextResponse.json(
      { error: "Failed to exit proxy session" },
      { status: 500 }
    );
  }
}
