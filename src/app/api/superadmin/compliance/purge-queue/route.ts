import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // List users pending purge (account_status = "suspended_deleting")
    const users = await db.user.findMany({
      where: { account_status: "suspended_deleting" },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        deletion_requested_at: true,
        created_at: true,
      },
      orderBy: { deletion_requested_at: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[SUPERADMIN_COMPLIANCE_PURGE_QUEUE]", error);
    return NextResponse.json(
      { error: "Failed to fetch purge queue" },
      { status: 500 }
    );
  }
}
