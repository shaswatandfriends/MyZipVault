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
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_status: true,
        phone: true,
        is_approved: true,
        must_change_pass: true,
        last_activity_at: true,
        created_at: true,
        organization_id: true,
        organization: {
          select: {
            id: true,
            name: true,
            credits_balance: true,
            baa_status: true,
            seat_limit: true,
          },
        },
        candidate_profile: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            profile_completion_pct: true,
          },
        },
        credentials: {
          select: {
            id: true,
            document_name: true,
            file_url: true,
            expiration_date: true,
            status: true,
            verification_status: true,
            uploaded_at: true,
          },
          orderBy: { uploaded_at: "desc" },
        },
        candidate_references: {
          select: {
            id: true,
            manager_email: true,
            manager_phone: true,
            facility_name: true,
            employment_status: true,
            status: true,
            requested_at: true,
          },
          orderBy: { requested_at: "desc" },
        },
        candidate_checklist_responses: {
          select: {
            id: true,
            status: true,
            valid_until: true,
            submitted_at: true,
            checklist_template: {
              select: {
                id: true,
                name: true,
                profession: true,
                specialty: true,
              },
            },
          },
          orderBy: { submitted_at: "desc" },
        },
        consent_shares_as_candidate: {
          select: {
            id: true,
            shared_at: true,
            expires_at: true,
            is_deleted: true,
            client_user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                organization: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { shared_at: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Format the response
    const profile: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      accountStatus: user.account_status,
      phone: user.phone,
      isApproved: user.is_approved,
      mustChangePass: user.must_change_pass,
      lastActivityAt: user.last_activity_at,
      createdAt: user.created_at,
      organizationId: user.organization_id,
      organization: user.organization,
    };

    // Add candidate-specific data
    if (user.role === "candidate") {
      profile.candidateProfile = user.candidate_profile;
      profile.credentials = user.credentials;
      profile.references = user.candidate_references;
      profile.checklists = user.candidate_checklist_responses;
      profile.shares = user.consent_shares_as_candidate;
    }

    // Add recruiter-specific data
    if (user.role === "client_recruiter" || user.role === "client_admin") {
      profile.recruiterOrganization = user.organization;
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Admin User Profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
