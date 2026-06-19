import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { changeStatus, blacklistLead, setNextAction } from "@/lib/bob/status-engine";
import { ALL_STATUSES, COMPANY_POOL_STATUSES, type CandidateStatus } from "@/lib/bob/types";

/**
 * GET /api/recruiter/bob/[id]
 *
 * Fetch a single lead with all related data for the candidate profile page.
 *
 * Visibility:
 *   - client_recruiter: can see own BOB leads + any company pool lead in their org
 *   - client_admin: can see all leads in their org
 *   - super_admin: can see any lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId },
      include: {
        recruiter_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            email_verified_at: true,
            candidate_profile: true,
          },
        },
        blacklisted_by: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        activities: {
          orderBy: { created_at: "desc" },
          take: 100,
          include: {
            actor: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        },
        vault_sign_documents: {
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            document_name: true,
            document_type: true,
            status: true,
            created_at: true,
            updated_at: true,
            expiry_date: true,
            signers: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                signed_at: true,
                declined_at: true,
              },
            },
          },
        },
        call_schedules: {
          orderBy: { created_at: "desc" },
          take: 10,
        },
        call_logs: {
          orderBy: { created_at: "desc" },
          take: 10,
        },
        _count: {
          select: {
            activities: true,
            vault_sign_documents: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // ─── Visibility check ────────────────────────────────────────
    if (role !== "super_admin") {
      const isOwner = lead.recruiter_user_id === userId;
      const isInOrg = lead.organization_id === orgId;
      const isCompanyPool = COMPANY_POOL_STATUSES.includes(lead.pipeline_stage as any);

      if (!isInOrg) {
        return NextResponse.json({ error: "Not in your organization" }, { status: 403 });
      }

      if (role === "client_recruiter") {
        // Recruiters can see: own BOB leads + company pool leads in their org
        if (!isOwner && !isCompanyPool) {
          return NextResponse.json({ error: "You don't have access to this lead" }, { status: 403 });
        }
      }
      // client_admin can see all leads in their org — no extra check needed
    }

    // ─── Fetch candidate's real data (if linked to a platform account) ───
    // These power the Documents, Checklist, and Requests tabs in the profile.
    let candidateCredentials: any[] = [];
    let candidateChecklistRequests: any[] = [];
    let candidateShareRequests: any[] = [];
    let candidateResume: any = null;

    if (lead.candidate_user_id) {
      const candidateUserId = lead.candidate_user_id;

      [candidateCredentials, candidateChecklistRequests, candidateShareRequests, candidateResume] = await Promise.all([
        // Credentials (BLS, ACLS, etc.)
        db.credential.findMany({
          where: { candidate_user_id: candidateUserId },
          orderBy: { uploaded_at: "desc" },
          select: {
            id: true,
            document_name: true,
            file_url: true,
            expiration_date: true,
            status: true,
            verification_status: true,
            uploaded_at: true,
            review_notes: true,
          },
        }),
        // Checklist requests (compliance checklists sent to this candidate)
        db.checklistRequest.findMany({
          where: { candidate_user_id: candidateUserId },
          orderBy: { created_at: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            completion_pct: true,
            opened_at: true,
            created_at: true,
            checklist_template: {
              select: { id: true, name: true, profession: true, specialty: true },
            },
            client_user: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        }),
        // Share requests (document share requests from recruiters)
        db.shareRequest.findMany({
          where: { candidate_user_id: candidateUserId },
          orderBy: { created_at: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            request_checklists: true,
            request_credentials: true,
            request_resume: true,
            request_references: true,
            message: true,
            created_at: true,
            client_user: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        }),
        // Resume
        db.resume.findFirst({
          where: { candidate_user_id: candidateUserId },
          select: {
            id: true,
            file_url: true,
            parsed_data: true,
            created_at: true,
          },
        }),
      ]);
    }

    return NextResponse.json({
      lead,
      candidateData: {
        credentials: candidateCredentials,
        checklistRequests: candidateChecklistRequests,
        shareRequests: candidateShareRequests,
        resume: candidateResume,
      },
    });
  } catch (error: any) {
    console.error("[BOB GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch lead" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/recruiter/bob/[id]
 *
 * Update lead fields. Body can include any of:
 *   - first_name, last_name, email, phone, job_title, specialty
 *   - reached_for, remark, source
 *   - pipeline_stage (status change — uses status engine, logs activity)
 *   - notes
 *   - next_action, next_action_at
 *   - star_rating
 *   - blacklist_reason (if provided, will blacklist the lead)
 *
 * Visibility:
 *   - Owner of the lead OR client_admin in same org OR super_admin
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId },
      select: { id: true, recruiter_user_id: true, organization_id: true, pipeline_stage: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // ─── Visibility check ────────────────────────────────────────
    if (role !== "super_admin") {
      const isOwner = lead.recruiter_user_id === userId;
      const isInOrg = lead.organization_id === orgId;
      const isAdmin = role === "client_admin";

      if (!isInOrg || (!isOwner && !isAdmin)) {
        return NextResponse.json({ error: "Not authorized to edit this lead" }, { status: 403 });
      }
    }

    const body = await request.json();

    // ─── Handle blacklist (special case) ────────────────────────
    if (body.blacklist_reason !== undefined) {
      if (!body.blacklist_reason?.trim()) {
        return NextResponse.json({ error: "Blacklist reason required" }, { status: 400 });
      }
      await blacklistLead({
        leadId,
        reason: body.blacklist_reason.trim(),
        actorUserId: userId,
      });
      const updated = await db.recruiterLead.findUnique({ where: { id: leadId } });
      return NextResponse.json({ lead: updated });
    }

    // ─── Handle status change (uses status engine) ──────────────
    if (body.pipeline_stage && body.pipeline_stage !== lead.pipeline_stage) {
      if (!ALL_STATUSES.includes(body.pipeline_stage as CandidateStatus)) {
        return NextResponse.json({ error: `Invalid status: ${body.pipeline_stage}` }, { status: 400 });
      }

      const result = await changeStatus({
        leadId,
        newStatus: body.pipeline_stage as CandidateStatus,
        actorUserId: userId,
        actorType: "recruiter",
        reason: body.status_reason,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // ─── Handle next action ─────────────────────────────────────
    if (body.next_action !== undefined) {
      await setNextAction({
        leadId,
        action: body.next_action || "",
        when: body.next_action_at ? new Date(body.next_action_at) : undefined,
        actorUserId: userId,
      });
    }

    // ─── Update basic fields ────────────────────────────────────
    const updateData: any = { updated_at: new Date() };
    const allowedFields = [
      "first_name", "last_name", "email", "phone", "job_title", "specialty",
      "reached_for", "remark", "source", "notes", "star_rating",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await db.recruiterLead.update({
      where: { id: leadId },
      data: updateData,
    });

    return NextResponse.json({ lead: updated });
  } catch (error: any) {
    console.error("[BOB PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update lead" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/recruiter/bob/[id]
 *
 * Soft-delete a lead by moving it to "not_interested" (preserves audit trail).
 * We never hard-delete — the lead stays in the database for compliance/audit.
 *
 * Visibility: owner OR admin in same org OR super_admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId },
      select: { id: true, recruiter_user_id: true, organization_id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (role !== "super_admin") {
      const isOwner = lead.recruiter_user_id === userId;
      const isInOrg = lead.organization_id === orgId;
      const isAdmin = role === "client_admin";

      if (!isInOrg || (!isOwner && !isAdmin)) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Soft delete — move to not_interested
    await changeStatus({
      leadId,
      newStatus: "not_interested",
      actorUserId: userId,
      actorType: "recruiter",
      reason: "Lead removed by recruiter",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[BOB DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete lead" },
      { status: 500 },
    );
  }
}
