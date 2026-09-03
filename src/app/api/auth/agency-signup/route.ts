import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { agencySignupSchema, validateBody } from "@/lib/validation-schemas";
import { logAuthError } from "@/lib/auth-logger";
import { findReferrer, grantReferralCredits } from "@/lib/referrals";

/**
 * POST /api/auth/agency-signup
 *
 * Agency / recruiter self-signup. Creates a pending organization + user
 * account that requires superadmin approval before login is allowed.
 *
 * Uses the shared Zod `agencySignupSchema` which enforces:
 *   - email: valid email, max 255 chars, lowercased
 *   - password: 8–128 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit
 *   - companyName: required, max 100 chars
 *   - firstName / lastName: required, max 100 chars
 *   - phone: optional, max 30 chars
 *   - companyAddress / companyWebsite: optional
 *
 * The frontend sends an additional `accountType` field ("agency" or
 * "recruiter") which we validate separately (not part of the Zod schema
 * because it controls whether an Organization is created).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Validate accountType separately (controls org creation logic) ──
    const { accountType, ...schemaFields } = body;

    if (!accountType || !["agency", "recruiter"].includes(accountType)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    if (accountType === "agency" && !body.agencyName?.trim() && !body.companyName?.trim()) {
      return NextResponse.json(
        { error: "Agency name is required for agency accounts" },
        { status: 400 }
      );
    }

    // ── Zod validation (replaces the hand-rolled regex checks) ──
    // We pass schemaFields to skip accountType, which isn't in the schema.
    const validation = validateBody(agencySignupSchema, schemaFields);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { email, password, firstName, lastName, phone, companyAddress, companyWebsite } = validation.data;
    // Page sends `agencyName` for agency accounts; fall back to `companyName`.
    const companyName = validation.data.agencyName || validation.data.companyName || "";

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
    // ── For Independent Recruiter: auto-create a personal org so all
    //    API routes (credits, VaultSign, checklists) work without changes.
    //    The org name is "FirstName LastName — Independent Recruiter".
    let organizationId: number | null = null;

    if (accountType === "agency") {
      const organization = await db.organization.create({
        data: {
          name: companyName, // agencySignupSchema requires companyName
          credits_balance: 0,
          baa_status: "pending",
          seat_limit: 5,
          account_status: "pending", // Admin must activate from admin panel
        },
      });
      organizationId = organization.id;
    } else {
      // Independent recruiter — auto-create a personal org
      const personalOrgName = `${firstName} ${lastName} — Independent Recruiter`;
      const personalOrg = await db.organization.create({
        data: {
          name: personalOrgName,
          credits_balance: 10, // Free trial: 10 credits
          baa_status: "pending",
          seat_limit: 1, // Solo — just themselves
          account_status: "active", // Active immediately
        },
      });
      organizationId = personalOrg.id;
    }

    // ── Create User (active by default — no admin approval needed) ──
    const user = await db.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role,
        first_name: firstName,
        last_name: lastName,
        organization_id: organizationId,
        is_approved: true, // Active immediately
        account_status: "active", // No pending approval — log in right away
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
            logAuthError(`[AGENCY_SIGNUP] Failed to notify super admin: ${admin.id}`, err);
          }
        }
      } catch (notifErr) {
        logAuthError("[AGENCY_SIGNUP] Failed to send signup notifications", notifErr);
        // Non-blocking
      }
    }

    // ─── Referral: if the request body has a ref code, grant credits to the
    // referrer (or just record it for candidate referrers). ──
    try {
      const refCode = (body.ref as string | undefined) || "";
      const referrer = await findReferrer(refCode);
      if (referrer && referrer.id !== user.id) {
        await grantReferralCredits({
          referrerId: referrer.id,
          referredUserId: user.id,
          referredEmail: user.email,
        });
      }
    } catch (refErr) {
      console.error("[AGENCY_SIGNUP_REFERRAL] Failed to process referral:", refErr);
      // Non-blocking — signup still succeeds
    }

    return NextResponse.json(
      {
        message: "Account created successfully. You can now log in.",
        userId: user.id,
        role: user.role,
        requiresApproval: false,
      },
      { status: 201 }
    );
  } catch (error) {
    logAuthError("[AGENCY_SIGNUP]", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
