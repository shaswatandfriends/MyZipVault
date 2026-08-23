import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { validateBody, superadminUserActionSchema, superadminUserCreateSchema } from "@/lib/validation-schemas";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "all";
    const statusFilter = searchParams.get("status") || "all";
    const organizationId = searchParams.get("organizationId") || searchParams.get("companyId") || "all";
    const lastLoginFrom = searchParams.get("lastLoginFrom") || "";
    const lastLoginTo = searchParams.get("lastLoginTo") || "";
    const profileMin = searchParams.get("profileMin") || "";
    const profileMax = searchParams.get("profileMax") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 20;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (roleFilter !== "all") {
      where.role = roleFilter;
    }

    if (statusFilter !== "all") {
      where.account_status = statusFilter;
    }

    if (organizationId !== "all") {
      where.organization_id = parseInt(organizationId, 10);
    }

    if (lastLoginFrom || lastLoginTo) {
      const lastActivity: Record<string, Date> = {};
      if (lastLoginFrom) lastActivity.gte = new Date(lastLoginFrom);
      if (lastLoginTo) lastActivity.lte = new Date(lastLoginTo);
      where.last_activity_at = lastActivity;
    }

    // Profile completion filter (via candidate profile relation)
    if (profileMin || profileMax) {
      const profileFilter: Record<string, number> = {};
      if (profileMin) profileFilter.gte = parseInt(profileMin, 10);
      if (profileMax) profileFilter.lte = parseInt(profileMax, 10);
      where.candidate_profile = { profile_completion_pct: profileFilter };
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
          phone: true,
          last_activity_at: true,
          created_at: true,
          is_approved: true,
          organization: {
            select: { id: true, name: true },
          },
          candidate_profile: {
            select: { profile_completion_pct: true },
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
        phone: u.phone,
        organization: u.organization
          ? { id: u.organization.id, name: u.organization.name }
          : null,
        lastActivityAt: u.last_activity_at,
        createdAt: u.created_at,
        isApproved: u.is_approved,
        profileCompletionPct: u.candidate_profile?.profile_completion_pct ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Superadmin Users GET error:", error);
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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // ── Branch: Create new user (action === "create") ──────────────
    if (body.action === "create") {
      const result = validateBody(superadminUserCreateSchema, body);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const { email, firstName, lastName, role, phone, organizationId, sendInviteEmail } = result.data;

      // Check for existing user
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }

      // Generate a random temporary password (user must change on first login)
      const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
      const hashedPassword = await hash(tempPassword, 12);

      const newUser = await db.user.create({
        data: {
          email,
          first_name: firstName ?? null,
          last_name: lastName ?? null,
          role,
          phone: phone ?? null,
          password_hash: hashedPassword,
          must_change_pass: true,
          is_approved: true,
          organization_id: organizationId ?? null,
        },
        select: { id: true, email: true, role: true },
      });

      // Audit log
      const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
      await db.auditLog.create({
        data: {
          user_id: actionerId,
          role: "super_admin",
          action: "create_user",
          entity_type: "user",
          entity_id: newUser.id,
          details: `Created ${role} user ${email}`,
        },
      });

      // TODO: If sendInviteEmail is true, send an invite email with a
      // password-reset link so the user can set their own password.
      // For now, return the temp password so the admin can share it.

      return NextResponse.json({
        success: true,
        message: `User created. Temporary password: ${tempPassword}`,
        user: newUser,
        tempPassword, // Only returned once — admin must share with user
      });
    }

    // ── Branch: Action on existing user (suspend/ban/etc.) ─────────
    const result = validateBody(superadminUserActionSchema, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { action, userId } = result.data;

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent actions on super_admin
    if (targetUser.role === "super_admin" && action !== "force-reset-password") {
      return NextResponse.json(
        { error: "Cannot perform this action on a super admin" },
        { status: 403 }
      );
    }

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);

    switch (action) {
      case "force-reset-password": {
        await db.user.update({
          where: { id: userId },
          data: { must_change_pass: true },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "force_reset_password",
            entity_type: "user",
            entity_id: userId,
          },
        });
        return NextResponse.json({ success: true, message: "Password reset forced" });
      }
      case "suspend": {
        await db.user.update({
          where: { id: userId },
          data: { account_status: "suspended" },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "suspend_user",
            entity_type: "user",
            entity_id: userId,
          },
        });
        return NextResponse.json({ success: true, message: "User suspended" });
      }
      case "ban": {
        await db.user.update({
          where: { id: userId },
          data: { account_status: "deleted" },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "ban_user",
            entity_type: "user",
            entity_id: userId,
          },
        });
        return NextResponse.json({ success: true, message: "User banned" });
      }
      case "unsuspend": {
        await db.user.update({
          where: { id: userId },
          data: { account_status: "active" },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "unsuspend_user",
            entity_type: "user",
            entity_id: userId,
          },
        });
        return NextResponse.json({ success: true, message: "User unsuspended" });
      }
      case "proxy-login": {
        // Log the proxy login
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "proxy_login",
            entity_type: "user",
            entity_id: userId,
          },
        });
        // Return user info so the frontend can create a proxy session
        return NextResponse.json({
          success: true,
          message: "Proxy login authorized",
          proxyUser: {
            id: targetUser.id,
            email: targetUser.email,
            role: targetUser.role,
            organizationId: targetUser.organization_id,
            isApproved: targetUser.is_approved,
            firstName: targetUser.first_name,
            lastName: targetUser.last_name,
          },
        });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Users POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
