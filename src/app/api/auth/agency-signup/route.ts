import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, accountType, agencyName } = body;

    // ── Validation ──
    if (!email || !password || !firstName || !lastName || !accountType) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    if (!["agency", "recruiter"].includes(accountType)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    if (accountType === "agency" && !agencyName?.trim()) {
      return NextResponse.json(
        { error: "Agency name is required for agency accounts" },
        { status: 400 }
      );
    }

    // Password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter" },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one lowercase letter" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number" },
        { status: 400 }
      );
    }

    // Check for existing user
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const role = accountType === "agency" ? "client_admin" : "client_recruiter";

    // ── For Agency: create Organization first ──
    let organizationId: number | null = null;

    if (accountType === "agency") {
      const organization = await db.organization.create({
        data: {
          name: agencyName.trim(),
          credits_balance: 0,
          baa_status: "pending",
          seat_limit: 5,
        },
      });
      organizationId = organization.id;
    }

    // ── Create User (unapproved by default) ──
    const user = await db.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        organization_id: organizationId,
        is_approved: false, // Requires admin approval
        account_status: "active",
        tos_accepted_at: new Date(),
      },
    });

    // ── Audit log ──
    await db.auditLog.create({
      data: {
        user_id: user.id,
        role: user.role,
        action: "AGENCY_SIGNUP",
        entity_type: "User",
        entity_id: user.id,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully. Your account is pending admin approval.",
        userId: user.id,
        role: user.role,
        requiresApproval: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agency signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
