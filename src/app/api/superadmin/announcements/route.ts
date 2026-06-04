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

    const announcements = await db.announcement.findMany({
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        message: a.message,
        targetRole: a.target_role,
        isActive: a.is_active,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error("Superadmin Announcements GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actionerId = parseInt(session.user.id as string, 10);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { message, targetRole, isActive } = body;
        if (!message || !targetRole) {
          return NextResponse.json(
            { error: "Message and target role are required" },
            { status: 400 }
          );
        }

        const announcement = await db.announcement.create({
          data: {
            message,
            target_role: targetRole,
            is_active: isActive ?? false,
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "create_announcement",
            entity_type: "announcement",
            entity_id: announcement.id,
          },
        });

        return NextResponse.json({ success: true, id: announcement.id });
      }
      case "update": {
        const { id, message, targetRole, isActive } = body;
        if (!id) {
          return NextResponse.json(
            { error: "Announcement ID is required" },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (message !== undefined) updateData.message = message;
        if (targetRole !== undefined) updateData.target_role = targetRole;
        if (isActive !== undefined) updateData.is_active = isActive;

        await db.announcement.update({
          where: { id },
          data: updateData,
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "update_announcement",
            entity_type: "announcement",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "toggle": {
        const { id, isActive } = body;
        if (!id || isActive === undefined) {
          return NextResponse.json(
            { error: "Announcement ID and active status are required" },
            { status: 400 }
          );
        }

        await db.announcement.update({
          where: { id },
          data: { is_active: isActive },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "toggle_announcement",
            entity_type: "announcement",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "delete": {
        const { id } = body;
        if (!id) {
          return NextResponse.json(
            { error: "Announcement ID is required" },
            { status: 400 }
          );
        }

        await db.announcement.delete({ where: { id } });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "delete_announcement",
            entity_type: "announcement",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Announcements POST error:", error);
    return NextResponse.json(
      { error: "Failed to process announcement action" },
      { status: 500 }
    );
  }
}
