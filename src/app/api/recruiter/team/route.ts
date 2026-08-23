import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { generateSecurePassword } from "@/lib/password-generator";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (userRole !== "client_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Get organization details
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, seat_limit: true, credits_balance: true },
    });

    // Get all team members (recruiters + admins)
    const teamMembers = await db.user.findMany({
      where: {
        organization_id: organizationId,
        role: { in: ["client_recruiter", "client_admin"] },
        account_status: "active",
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        last_activity_at: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    });

    // Get credits used by each team member (via checklist requests)
    const teamMemberDetails = await Promise.all(
      teamMembers.map(async (member) => {
        const checklistCount = await db.checklistRequest.count({
          where: { client_user_id: member.id },
        });

        const unlockedCount = await db.unlockedDocument.count({
          where: { client_user_id: member.id },
        });

        // Get recent activity (last 5 actions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let recentRequests: any[] = [];
        try {
          recentRequests = await db.checklistRequest.findMany({
            where: { client_user_id: member.id },
            orderBy: { created_at: "desc" },
            take: 5,
            include: {
              candidate_user: { select: { first_name: true, last_name: true } },
              checklist_template: { select: { name: true } },
            },
          });
        } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }

        const recentUnlocks = await db.unlockedDocument.findMany({
          where: { client_user_id: member.id },
          orderBy: { unlocked_at: "desc" },
          take: 5,
        });

        const activities = [
          ...recentRequests.map((r) => ({
            type: "checklist_request" as const,
            description: `Sent ${r.checklist_template.name} to ${r.candidate_user.first_name} ${r.candidate_user.last_name}`,
            date: r.created_at,
          })),
          ...recentUnlocks.map((u) => ({
            type: "document_unlock" as const,
            description: `Unlocked ${u.entity_type} document`,
            date: u.unlocked_at,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        return {
          id: member.id,
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
          role: member.role,
          lastActivity: member.last_activity_at,
          createdAt: member.created_at,
          creditsUsed: checklistCount + unlockedCount,
          checklistRequestsSent: checklistCount,
          documentsUnlocked: unlockedCount,
          recentActivity: activities,
        };
      })
    );

    // Fill remaining seats
    const activeSeats = teamMembers.length;
    const seatLimit = organization?.seat_limit ?? 5;
    const emptySeats = Math.max(0, seatLimit - activeSeats);

    return NextResponse.json({
      organization: {
        name: organization?.name ?? "",
        seatLimit,
        creditsBalance: organization?.credits_balance ?? 0,
      },
      teamMembers: teamMemberDetails,
      activeSeats,
      emptySeats,
    });
  } catch (error) {
    console.error("Team GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team data" },
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

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (userRole !== "client_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { action, email, firstName, lastName, seatUserId, role: memberRole } = body;

    if (action === "add_recruiter") {
      if (!email || !firstName || !lastName) {
        return NextResponse.json(
          { error: "Email, first name, and last name are required" },
          { status: 400 }
        );
      }
      const targetRole = memberRole === "client_admin" ? "client_admin" : "client_recruiter";

      // Check seat limit
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { seat_limit: true },
      });

      const currentMembers = await db.user.count({
        where: {
          organization_id: organizationId,
          role: { in: ["client_recruiter", "client_admin"] },
          account_status: "active",
        },
      });

      if (currentMembers >= (org?.seat_limit ?? 5)) {
        return NextResponse.json(
          { error: "Seat limit reached. Please upgrade your plan to add more recruiters." },
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

      // Check if email already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }

      // Create user with selected role
      const bcrypt = await import("bcryptjs");
      const rawPassword = generateSecurePassword(12);
      const tempPassword = await bcrypt.hash(rawPassword, 12);

      const newUser = await db.user.create({
        data: {
          email,
          password_hash: tempPassword,
          role: targetRole,
          organization_id: organizationId,
          is_approved: true,
          first_name: firstName,
          last_name: lastName,
          must_change_pass: true,
        },
      });

      // Create invite token
      await db.inviteToken.create({
        data: {
          token: uuidv4(),
          email,
          role: targetRole,
          token_type: "recruiter_invite",
          invited_by: userId,
          organization_id: organizationId,
          is_used: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Invitation sent to ${firstName} ${lastName} at ${email}`,
        userId: newUser.id,
        password: rawPassword,
      }, { status: 201 });
    }

    if (action === "change_email") {
      if (!seatUserId || !email) {
        return NextResponse.json(
          { error: "seatUserId and email are required" },
          { status: 400 }
        );
      }

      // Verify the user belongs to this org
      const targetUser = await db.user.findFirst({
        where: {
          id: Number(seatUserId),
          organization_id: organizationId,
          role: "client_recruiter",
        },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found in your organization" }, { status: 404 });
      }

      // Check if new email is already taken
      const emailExists = await db.user.findUnique({
        where: { email },
      });

      if (emailExists && emailExists.id !== targetUser.id) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
      }

      await db.user.update({
        where: { id: targetUser.id },
        data: { email },
      });

      return NextResponse.json({
        success: true,
        message: `Email updated to ${email}`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Team POST error:", error);
    return NextResponse.json(
      { error: "Failed to process team action" },
      { status: 500 }
    );
  }
}
