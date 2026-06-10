import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
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

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plain_password: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow viewing passwords for recruiter/client_admin roles
    if (user.role !== "client_recruiter" && user.role !== "client_admin") {
      return NextResponse.json(
        { error: "Cannot view password for this user type" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      password: user.plain_password ?? null,
    });
  } catch (error) {
    console.error("[SUPERADMIN_SKILLCHECKLIST_RECRUITER_PASSWORD]", error);
    return NextResponse.json(
      { error: "Failed to fetch password" },
      { status: 500 }
    );
  }
}
