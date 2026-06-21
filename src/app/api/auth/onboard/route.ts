import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const inviteToken = await db.inviteToken.findUnique({
      where: { token },
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    if (inviteToken.is_used) {
      return NextResponse.json(
        { error: "This invite link has already been used" },
        { status: 400 }
      );
    }

    if (new Date() > inviteToken.expires_at) {
      return NextResponse.json(
        { error: "This invite link has expired" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: inviteToken.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: {
        email: inviteToken.email,
        password_hash: passwordHash,
        role: inviteToken.role,
        organization_id: inviteToken.organization_id,
        first_name: inviteToken.role === "candidate" ? "" : null,
        last_name: inviteToken.role === "candidate" ? "" : null,
        is_approved: true,
        account_status: "active",
        tos_accepted_at: new Date(),
      },
    });

    if (inviteToken.role === "candidate") {
      await db.candidateProfile.create({
        data: {
          user_id: user.id,
          first_name: "",
          last_name: "",
          phone: "",
          profile_completion_pct: 0,
        },
      });
    }

    await db.inviteToken.update({
      where: { id: inviteToken.id },
      data: { is_used: true },
    });

    // ─── Notify the inviter that their team member has onboarded ───
    if (inviteToken.invited_by) {
      try {
        // Fetch the new user's full name (the user was just created above)
        const newUser = await db.user.findUnique({
          where: { id: user.id },
          select: { first_name: true, last_name: true },
        });
        const newUserFullName =
          `${newUser?.first_name ?? ""} ${newUser?.last_name ?? ""}`.trim() ||
          "A new team member";

        const { createNotification } = await import("@/lib/notifications/create");
        await createNotification({
          userId: inviteToken.invited_by,
          category: "system",
          priority: "info",
          title: "New team member 🎉",
          message: `${newUserFullName} has joined your team.`,
          actionUrl: "/recruiter/team",
          actionLabel: "View team",
          relatedEntityId: user.id,
          relatedEntityType: "user",
        });
      } catch (notifErr) {
        console.error("[ONBOARD] Failed to notify inviter:", notifErr);
        // Non-blocking
      }
    }

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Onboard error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const inviteToken = await db.inviteToken.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    if (inviteToken.is_used) {
      return NextResponse.json(
        { error: "This invite link has already been used" },
        { status: 400 }
      );
    }

    if (new Date() > inviteToken.expires_at) {
      return NextResponse.json(
        { error: "This invite link has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: inviteToken.email,
      role: inviteToken.role,
      tokenType: inviteToken.token_type,
      agencyName: inviteToken.agency_name || inviteToken.organization?.name,
      facilityName: inviteToken.facility_name,
      nurseName: inviteToken.nurse_name,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}
