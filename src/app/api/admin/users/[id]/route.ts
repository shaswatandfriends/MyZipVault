import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        phone: true,
        account_status: true,
        must_change_pass: true,
        is_approved: true,
        last_activity_at: true,
        created_at: true,
        organization: {
          select: { id: true, name: true },
        },
        candidate_profile: {
          select: { profile_completion_pct: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[ADMIN_USER_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

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
    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();
    const { action } = body;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "suspend") {
      await db.user.update({
        where: { id: userId },
        data: { account_status: "suspended" },
      });
    } else if (action === "unsuspend") {
      await db.user.update({
        where: { id: userId },
        data: { account_status: "active" },
      });
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'suspend' or 'unsuspend'" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_USER_DETAIL_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Not implemented. Use superadmin for permanent delete." },
    { status: 501 }
  );
}
