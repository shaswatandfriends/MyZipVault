import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

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

    const organizations = await db.organization.findMany({
      orderBy: { created_at: "desc" },
      include: {
        users: {
          select: { id: true, email: true, first_name: true, last_name: true, role: true, account_status: true, last_activity_at: true, created_at: true, must_change_pass: true },
        },
        credit_transactions: {
          orderBy: { created_at: "desc" },
          take: 50,
        },
      },
    });

    return NextResponse.json({
      companies: organizations.map((org) => {
        const seatsUsed = org.users.filter(
          (u) => (u.role === "client_recruiter" || u.role === "client_admin") && u.account_status === "active"
        ).length;
        return {
          id: org.id,
          name: org.name,
          creditsBalance: org.credits_balance,
          baaStatus: org.baa_status,
          baaSignedByName: org.baa_signed_by_name,
          baaSignedAt: org.baa_signed_at,
          seatLimit: org.seat_limit,
          seatsUsed,
          customPricingNotes: org.custom_pricing_notes,
          createdAt: org.created_at,
          members: org.users
            .filter((u) => u.role === "client_recruiter" || u.role === "client_admin")
          .map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            role: u.role,
            accountStatus: u.account_status,
            lastActivityAt: u.last_activity_at,
            createdAt: u.created_at,
            mustChangePass: u.must_change_pass,
          })),
          transactions: org.credit_transactions.map((t) => ({
            id: t.id,
            transactionType: t.transaction_type,
            creditAmount: t.credit_amount,
            description: t.description,
            createdAt: t.created_at,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("Superadmin Companies GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
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
        const { name, initialCredits, seatLimit, customPricingNotes } = body;
        if (!name) {
          return NextResponse.json({ error: "Company name is required" }, { status: 400 });
        }
        const org = await db.organization.create({
          data: {
            name,
            credits_balance: initialCredits ?? 0,
            seat_limit: seatLimit ?? 5,
            custom_pricing_notes: customPricingNotes ?? null,
          },
        });
        if (initialCredits && initialCredits > 0) {
          await db.creditTransaction.create({
            data: {
              organization_id: org.id,
              transaction_type: "purchase",
              credit_amount: initialCredits,
              description: "Initial credit allocation",
            },
          });
        }
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "create_company",
            entity_type: "organization",
            entity_id: org.id,
          },
        });
        return NextResponse.json({ success: true, organizationId: org.id });
      }
      case "edit": {
        const { organizationId, name, customPricingNotes } = body;
        if (!organizationId) {
          return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
        }
        const data: Record<string, unknown> = {};
        if (name) data.name = name;
        if (customPricingNotes !== undefined) data.custom_pricing_notes = customPricingNotes;
        await db.organization.update({
          where: { id: organizationId },
          data,
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "edit_company",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "set-credits": {
        const { organizationId, creditAmount, description } = body;
        if (!organizationId || creditAmount === undefined) {
          return NextResponse.json({ error: "Organization ID and credit amount are required" }, { status: 400 });
        }
        const org = await db.organization.findUnique({ where: { id: organizationId } });
        if (!org) {
          return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }
        const newBalance = Math.max(0, org.credits_balance + creditAmount);
        await db.organization.update({
          where: { id: organizationId },
          data: { credits_balance: newBalance },
        });
        await db.creditTransaction.create({
          data: {
            organization_id: organizationId,
            transaction_type: creditAmount >= 0 ? "purchase" : "deduction",
            credit_amount: Math.abs(creditAmount),
            description: description || (creditAmount >= 0 ? "Manual credit addition" : "Manual credit deduction"),
          },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "set_credits",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true, newBalance });
      }
      case "set-seat-limit": {
        const { organizationId, seatLimit } = body;
        if (!organizationId || seatLimit === undefined) {
          return NextResponse.json({ error: "Organization ID and seat limit are required" }, { status: 400 });
        }
        await db.organization.update({
          where: { id: organizationId },
          data: { seat_limit: seatLimit },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "set_seat_limit",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "set-baa-status": {
        const { organizationId, baaStatus, baaSignedByName, baaSignedByTitle } = body;
        if (!organizationId || !baaStatus) {
          return NextResponse.json({ error: "Organization ID and BAA status are required" }, { status: 400 });
        }
        const data: Record<string, unknown> = { baa_status: baaStatus };
        if (baaStatus === "signed") {
          if (baaSignedByName) data.baa_signed_by_name = baaSignedByName;
          if (baaSignedByTitle) data.baa_signed_by_title = baaSignedByTitle;
          data.baa_signed_at = new Date();
        }
        await db.organization.update({
          where: { id: organizationId },
          data,
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "set_baa_status",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "swap-email": {
        const { userId, newEmail } = body;
        if (!userId || !newEmail) {
          return NextResponse.json({ error: "User ID and new email are required" }, { status: 400 });
        }
        const existingUser = await db.user.findUnique({ where: { email: newEmail } });
        if (existingUser) {
          return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }
        await db.user.update({
          where: { id: userId },
          data: { email: newEmail },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "swap_email",
            entity_type: "user",
            entity_id: userId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "add-recruiter": {
        const { organizationId, email, firstName, lastName, role: memberRole } = body;
        if (!organizationId || !email || !firstName || !lastName) {
          return NextResponse.json(
            { error: "Organization ID, email, first name, and last name are required" },
            { status: 400 }
          );
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }
        const targetRole = memberRole === "client_admin" ? "client_admin" : "client_recruiter";

        // Check seat limit
        const org = await db.organization.findUnique({
          where: { id: organizationId },
          select: { seat_limit: true, name: true },
        });
        if (!org) {
          return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }
        const currentMembers = await db.user.count({
          where: {
            organization_id: organizationId,
            role: { in: ["client_recruiter", "client_admin"] },
            account_status: "active",
          },
        });
        if (currentMembers >= org.seat_limit) {
          return NextResponse.json(
            { error: `Seat limit reached (${org.seat_limit}/${org.seat_limit}). Increase the seat limit first.` },
            { status: 400 }
          );
        }

        // Enforce single admin rule
        if (targetRole === "client_admin") {
          const existingAdmin = await db.user.findFirst({
            where: {
              organization_id: organizationId,
              role: "client_admin",
              account_status: "active",
            },
          });
          if (existingAdmin) {
            return NextResponse.json(
              { error: "This organization already has an admin. Only one admin is allowed per company." },
              { status: 400 }
            );
          }
        }

        // Check duplicate email
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
          return NextResponse.json(
            { error: "A user with this email already exists" },
            { status: 400 }
          );
        }

        // Generate random password
        const bcrypt = await import("bcryptjs");
        const rawPassword = Math.random().toString(36).slice(-10) + "Aa1!";
        const hashedPassword = await bcrypt.hash(rawPassword, 12);

        const newUser = await db.user.create({
          data: {
            email,
            password_hash: hashedPassword,
            role: targetRole,
            organization_id: organizationId,
            is_approved: true,
            first_name: firstName,
            last_name: lastName,
            must_change_pass: true,
            account_status: "active",
          },
        });

        // Create invite token
        await db.inviteToken.create({
          data: {
            token: uuidv4(),
            email,
            role: targetRole,
            token_type: "recruiter_invite",
            invited_by: actionerId,
            organization_id: organizationId,
            is_used: false,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        // Audit log
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "add_recruiter",
            entity_type: "user",
            entity_id: newUser.id,
            details: `Added ${targetRole === "client_admin" ? "admin" : "recruiter"} ${firstName} ${lastName} (${email}) to organization ${org.name}`,
          },
        });

        return NextResponse.json({
          success: true,
          message: `${targetRole === "client_admin" ? "Admin" : "Recruiter"} added successfully`,
          userId: newUser.id,
          password: rawPassword,
        });
      }
      case "reset-password": {
        const { userId: targetUserId } = body;
        if (!targetUserId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }
        const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (targetUser.role !== "client_recruiter" && targetUser.role !== "client_admin") {
          return NextResponse.json({ error: "Can only reset passwords for client users" }, { status: 400 });
        }
        const bcrypt = await import("bcryptjs");
        const newPassword = body.newPassword || (Math.random().toString(36).slice(-10) + "Aa1!");
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db.user.update({
          where: { id: targetUserId },
          data: {
            password_hash: hashedPassword,
            must_change_pass: true,
          },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "reset_password",
            entity_type: "user",
            entity_id: targetUserId,
            details: `Password reset for ${targetUser.email}`,
          },
        });
        return NextResponse.json({
          success: true,
          message: "Password reset successfully",
          password: newPassword,
        });
      }
      case "set-member-role": {
        const { userId: roleUserId, newRole, organizationId: roleOrgId } = body;
        if (!roleUserId || !newRole || !roleOrgId) {
          return NextResponse.json({ error: "User ID, new role, and organization ID are required" }, { status: 400 });
        }
        if (newRole !== "client_admin" && newRole !== "client_recruiter") {
          return NextResponse.json({ error: "Invalid role. Must be client_admin or client_recruiter" }, { status: 400 });
        }
        const roleUser = await db.user.findUnique({ where: { id: roleUserId } });
        if (!roleUser || roleUser.organization_id !== roleOrgId) {
          return NextResponse.json({ error: "User not found in this organization" }, { status: 404 });
        }
        // If promoting to admin, check single admin rule
        if (newRole === "client_admin") {
          const existingAdmin = await db.user.findFirst({
            where: {
              organization_id: roleOrgId,
              role: "client_admin",
              account_status: "active",
              id: { not: roleUserId },
            },
          });
          if (existingAdmin) {
            return NextResponse.json(
              { error: "This organization already has an admin. Only one admin is allowed per company. Demote the current admin first." },
              { status: 400 }
            );
          }
        }
        await db.user.update({
          where: { id: roleUserId },
          data: { role: newRole },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "change_member_role",
            entity_type: "user",
            entity_id: roleUserId,
            details: `Changed role of ${roleUser.email} from ${roleUser.role} to ${newRole}`,
          },
        });
        return NextResponse.json({
          success: true,
          message: `Role updated to ${newRole === "client_admin" ? "Admin" : "Recruiter"}`,
        });
      }
      case "suspend-member": {
        const { userId: suspendUserId } = body;
        if (!suspendUserId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }
        const suspendUser = await db.user.findUnique({ where: { id: suspendUserId } });
        if (!suspendUser) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (suspendUser.account_status === "suspended") {
          return NextResponse.json({ error: "User is already suspended" }, { status: 400 });
        }
        if (suspendUser.role !== "client_recruiter" && suspendUser.role !== "client_admin") {
          return NextResponse.json({ error: "Can only suspend client users" }, { status: 400 });
        }
        await db.user.update({
          where: { id: suspendUserId },
          data: { account_status: "suspended" },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "suspend_member",
            entity_type: "user",
            entity_id: suspendUserId,
            details: `Suspended member ${suspendUser.email}`,
          },
        });
        return NextResponse.json({
          success: true,
          message: `Member ${suspendUser.email} suspended successfully`,
        });
      }
      case "activate-member": {
        const { userId: activateUserId } = body;
        if (!activateUserId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }
        const activateUser = await db.user.findUnique({ where: { id: activateUserId } });
        if (!activateUser) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (activateUser.account_status === "active") {
          return NextResponse.json({ error: "User is already active" }, { status: 400 });
        }
        if (activateUser.role !== "client_recruiter" && activateUser.role !== "client_admin") {
          return NextResponse.json({ error: "Can only activate client users" }, { status: 400 });
        }
        // Check seat limit before activating
        if (activateUser.organization_id) {
          const org = await db.organization.findUnique({ where: { id: activateUser.organization_id } });
          if (org) {
            const activeMembers = await db.user.count({
              where: {
                organization_id: activateUser.organization_id,
                role: { in: ["client_recruiter", "client_admin"] },
                account_status: "active",
                id: { not: activateUserId },
              },
            });
            if (activeMembers >= org.seat_limit) {
              return NextResponse.json(
                { error: `Cannot activate: seat limit reached (${org.seat_limit}/${org.seat_limit}). Increase seat limit first.` },
                { status: 400 }
              );
            }
          }
        }
        await db.user.update({
          where: { id: activateUserId },
          data: { account_status: "active" },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "activate_member",
            entity_type: "user",
            entity_id: activateUserId,
            details: `Activated member ${activateUser.email}`,
          },
        });
        return NextResponse.json({
          success: true,
          message: `Member ${activateUser.email} activated successfully`,
        });
      }
      case "delete": {
        const { organizationId } = body;
        if (!organizationId) {
          return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
        }
        // Check for active users
        const activeUsers = await db.user.count({
          where: { organization_id: organizationId, account_status: "active" },
        });
        if (activeUsers > 0) {
          return NextResponse.json(
            { error: "Cannot delete organization with active users. Suspend or remove users first." },
            { status: 400 }
          );
        }
        await db.organization.delete({
          where: { id: organizationId },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "delete_company",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true, message: "Company deleted successfully" });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Companies POST error:", error);
    // Return more specific error messages instead of generic "Failed to perform action"
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
