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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const adminId = parseInt(id);

    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        account_status: true,
        is_approved: true,
        created_at: true,
        admin_permissions: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (!["platform_admin", "super_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "User is not an admin" }, { status: 400 });
    }

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("[SUPERADMIN_ADMIN_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch admin" },
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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const adminId = parseInt(id);
    const body = await request.json();
    const { permissions } = body;

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions and recreate
      await db.adminPermission.deleteMany({ where: { user_id: adminId } });

      for (const perm of permissions) {
        await db.adminPermission.create({
          data: {
            user_id: adminId,
            permission_name: perm.permission_name,
            is_allowed: perm.is_allowed ?? false,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_ADMIN_DETAIL_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update admin permissions" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Delete admin permissions then the user
    await db.adminPermission.deleteMany({ where: { user_id: adminId } });
    await db.user.delete({ where: { id: adminId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_ADMIN_DETAIL_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete admin" },
      { status: 500 }
    );
  }
}
