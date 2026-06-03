import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "all";
    const statusFilter = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 20;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (roleFilter !== "all") {
      where.role = roleFilter;
    }

    if (statusFilter !== "all") {
      where.account_status = statusFilter;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          role: true,
          account_status: true,
          organization_id: true,
          last_activity_at: true,
          created_at: true,
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role,
        accountStatus: u.account_status,
        organizationId: u.organization_id,
        organization: u.organization
          ? { id: u.organization.id, name: u.organization.name }
          : null,
        lastActivityAt: u.last_activity_at,
        createdAt: u.created_at,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Admin Users GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId } = body;

    if (!action || !userId) {
      return NextResponse.json(
        { error: "Action and userId are required" },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    switch (action) {
      case "reset-password": {
        // In production, send a password reset email
        await db.user.update({
          where: { id: userId },
          data: { must_change_pass: true },
        });
        return NextResponse.json({ success: true, message: "Password reset initiated" });
      }
      case "suspend": {
        await db.user.update({
          where: { id: userId },
          data: { account_status: "suspended" },
        });
        return NextResponse.json({ success: true, message: "User suspended" });
      }
      case "unsuspend": {
        await db.user.update({
          where: { id: userId },
          data: { account_status: "active" },
        });
        return NextResponse.json({ success: true, message: "User unsuspended" });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin Users POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
