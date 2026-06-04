import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

const ALL_PERMISSIONS = [
  "can_manage_credits",
  "can_reset_passwords",
  "can_proxy_login",
  "can_edit_content",
  "can_create_admins",
  "can_approve_reminders",
  "can_verify_documents",
  "can_edit_templates",
  "can_manage_announcements",
  "can_view_analytics",
] as const;

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

    const admins = await db.user.findMany({
      where: { role: { in: ["platform_admin", "super_admin"] } },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_status: true,
        is_approved: true,
        created_at: true,
        last_activity_at: true,
        admin_permissions: {
          select: {
            permission_name: true,
            is_allowed: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      admins: admins.map((a) => ({
        id: a.id,
        email: a.email,
        firstName: a.first_name,
        lastName: a.last_name,
        role: a.role,
        accountStatus: a.account_status,
        isApproved: a.is_approved,
        createdAt: a.created_at,
        lastActivityAt: a.last_activity_at,
        permissions: a.admin_permissions.map((p) => ({
          permissionName: p.permission_name,
          isAllowed: p.is_allowed,
        })),
      })),
      allPermissions: ALL_PERMISSIONS,
    });
  } catch (error) {
    console.error("Superadmin Admins GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
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

    const body = await request.json();
    const { action } = body;
    const actionerId = parseInt(session.user.id as string, 10);

    switch (action) {
      case "create": {
        const { email, firstName, lastName, permissions } = body;
        if (!email) {
          return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const existing = await db.user.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }

        // Generate a temporary password
        const tempPassword = `Tmp${Math.random().toString(36).slice(2, 10)}!`;
        const passwordHash = await hash(tempPassword, 12);

        const admin = await db.user.create({
          data: {
            email,
            first_name: firstName || null,
            last_name: lastName || null,
            password_hash: passwordHash,
            role: "platform_admin",
            is_approved: false,
            must_change_pass: true,
          },
        });

        // Set permissions
        if (permissions && Array.isArray(permissions)) {
          for (const perm of ALL_PERMISSIONS) {
            await db.adminPermission.create({
              data: {
                user_id: admin.id,
                permission_name: perm,
                is_allowed: permissions.includes(perm),
              },
            });
          }
        } else {
          // Default: no permissions
          for (const perm of ALL_PERMISSIONS) {
            await db.adminPermission.create({
              data: {
                user_id: admin.id,
                permission_name: perm,
                is_allowed: false,
              },
            });
          }
        }

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "create_admin",
            entity_type: "user",
            entity_id: admin.id,
          },
        });

        return NextResponse.json({
          success: true,
          adminId: admin.id,
          tempPassword,
          message: "Admin created. They must be approved before they can log in.",
        });
      }
      case "set-permissions": {
        const { adminId, permissions } = body;
        if (!adminId || !permissions) {
          return NextResponse.json({ error: "Admin ID and permissions are required" }, { status: 400 });
        }

        const targetAdmin = await db.user.findUnique({
          where: { id: adminId },
        });
        if (!targetAdmin || (targetAdmin.role !== "platform_admin" && targetAdmin.role !== "super_admin")) {
          return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        if (targetAdmin.role === "super_admin") {
          return NextResponse.json({ error: "Cannot modify super admin permissions" }, { status: 403 });
        }

        for (const perm of ALL_PERMISSIONS) {
          await db.adminPermission.upsert({
            where: {
              user_id_permission_name: {
                user_id: adminId,
                permission_name: perm,
              },
            },
            create: {
              user_id: adminId,
              permission_name: perm,
              is_allowed: permissions[perm] ?? false,
            },
            update: {
              is_allowed: permissions[perm] ?? false,
            },
          });
        }

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "set_admin_permissions",
            entity_type: "user",
            entity_id: adminId,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "approve": {
        const { adminId } = body;
        if (!adminId) {
          return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }

        await db.user.update({
          where: { id: adminId },
          data: { is_approved: true },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "approve_admin",
            entity_type: "user",
            entity_id: adminId,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "reject": {
        const { adminId } = body;
        if (!adminId) {
          return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }

        await db.user.update({
          where: { id: adminId },
          data: { account_status: "deleted" },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "reject_admin",
            entity_type: "user",
            entity_id: adminId,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "delete": {
        const { adminId } = body;
        if (!adminId) {
          return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }

        const targetAdmin = await db.user.findUnique({
          where: { id: adminId },
        });
        if (!targetAdmin) {
          return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }
        if (targetAdmin.role === "super_admin") {
          return NextResponse.json({ error: "Cannot delete super admin" }, { status: 403 });
        }

        await db.user.delete({
          where: { id: adminId },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "delete_admin",
            entity_type: "user",
            entity_id: adminId,
          },
        });

        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Admins POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
