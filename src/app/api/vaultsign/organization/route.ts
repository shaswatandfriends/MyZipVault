import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session-user";

// GET: Get current user's organization VaultSign settings
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = sessionUser.role;
    if (role !== "client_admin" && role !== "client_recruiter") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const orgId = sessionUser.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization found for this account" }, { status: 400 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        company_logo_url: true,
        company_address: true,
        company_phone: true,
        company_email: true,
        company_website: true,
        date_format: true,
        show_billing_to_recruiters: true,
        allow_credit_requests: true,
        allow_recruiter_csv_export: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error("[VAULTSIGN] Get org settings error:", error);
    return NextResponse.json({ error: "Failed to get org settings" }, { status: 500 });
  }
}

// PATCH: Update current user's organization VaultSign settings (client_admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "client_admin") {
      return NextResponse.json({ error: "Only client admins can update organization settings" }, { status: 403 });
    }

    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = [
      "company_logo_url",
      "company_address",
      "company_phone",
      "company_email",
      "company_website",
      "date_format",
      "show_billing_to_recruiters",
      "allow_credit_requests",
      "allow_recruiter_csv_export",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const org = await db.organization.update({
      where: { id: orgId },
      data: updateData,
      select: {
        id: true,
        name: true,
        company_logo_url: true,
        company_address: true,
        company_phone: true,
        company_email: true,
        company_website: true,
        date_format: true,
        show_billing_to_recruiters: true,
        allow_credit_requests: true,
        allow_recruiter_csv_export: true,
      },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("[VAULTSIGN] Update org settings error:", error);
    return NextResponse.json({ error: "Failed to update org settings" }, { status: 500 });
  }
}
