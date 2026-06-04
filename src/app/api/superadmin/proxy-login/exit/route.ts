import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logProxyExit } from "@/lib/audit";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number(session.user.id);

    // Log audit trail for exiting proxy
    await logProxyExit(userId, userRole);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_PROXY_LOGIN_EXIT]", error);
    return NextResponse.json(
      { error: "Failed to exit proxy session" },
      { status: 500 }
    );
  }
}
