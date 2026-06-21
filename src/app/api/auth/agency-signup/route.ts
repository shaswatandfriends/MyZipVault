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
          account_status: "pending", // Admin must activate from admin panel
        },
      });
      organizationId = organization.id;
    }

    // ── Create User (unapproved by default, pending admin activation) ──
    const user = await db.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        organization_id: organizationId,
        is_approved: false, // Requires admin approval
        account_status: "pending", // Admin must activate from admin panel
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

    // ── Notify all super admins about the new company signup ──
    if (organizationId) {
      try {
        const organization = await db.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        });
        const orgName = organization?.name ?? "A new organization";

        const superAdmins = await db.user.findMany({
          where: { role: "super_admin" },
          select: { id: true },
        });

        const { createNotification } = await import("@/lib/notifications/create");
        for (const admin of superAdmins) {
          try {
            await createNotification({
              userId: admin.id,
              category: "system",
              priority: "info",
              title: "New company signup 🏢",
              message: `${orgName} has signed up on MyZipVault.`,
              actionUrl: "/superadmin/companies",
              actionLabel: "View companies",
              relatedEntityId: organizationId,
              relatedEntityType: "organization",
            });
          } catch (err) {
            console.error("[AGENCY_SIGNUP] Failed to notify super admin:", admin.id, err);
          }
        }
      } catch (notifErr) {
        console.error("[AGENCY_SIGNUP] Failed to send signup notifications:", notifErr);
        // Non-blocking
      }
    }

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
