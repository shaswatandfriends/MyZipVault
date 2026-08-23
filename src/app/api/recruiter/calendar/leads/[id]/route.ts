import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { changeStatus } from "@/lib/bob/status-engine";
import { ALL_STATUSES, type CandidateStatus } from "@/lib/bob/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const leadId = Number(id);

    const lead = await db.recruiterLead.findFirst({
      where: {
        id: leadId,
        recruiter_user_id: userId,
        is_active: true,
      },
      include: {
        call_schedules: {
          orderBy: { created_at: "desc" },
        },
        call_logs: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_LEAD_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const leadId = Number(id);

    // Verify lead belongs to this recruiter
    const existing = await db.recruiterLead.findFirst({
      where: { id: leadId, recruiter_user_id: userId, is_active: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      specialty,
      reachedFor,
      remark,
      source,
      pipelineStage,
      starRating,
    } = body;

    const data: Record<string, unknown> = { updated_at: new Date() };

    if (firstName !== undefined) data.first_name = firstName;
    if (lastName !== undefined) data.last_name = lastName;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (jobTitle !== undefined) data.job_title = jobTitle || null;
    if (specialty !== undefined) data.specialty = specialty || null;
    if (reachedFor !== undefined) data.reached_for = reachedFor || null;
    if (remark !== undefined) data.remark = remark || null;
    if (source !== undefined) data.source = source;
    if (starRating !== undefined) data.star_rating = starRating || null;

    // ─── Route status changes through the BOB status engine ───────
    // This ensures the Calendar uses the SAME status system as BOB:
    //   - Logs activity to the timeline
    //   - Recomputes the tag (hot/warm/cold/inactive)
    //   - Handles Company Pool movement (inactive/not_interested/blacklisted)
    //   - Fires notifications
    // Without this, Calendar status changes would bypass all automation.
    if (pipelineStage !== undefined && pipelineStage !== existing.pipeline_stage) {
      if (!ALL_STATUSES.includes(pipelineStage as CandidateStatus)) {
        return NextResponse.json(
          { error: `Invalid status: ${pipelineStage}. Must be one of: ${ALL_STATUSES.join(", ")}` },
          { status: 400 },
        );
      }
      await changeStatus({
        leadId,
        newStatus: pipelineStage as CandidateStatus,
        actorUserId: userId,
        actorType: "recruiter",
        reason: "Status changed from Calendar",
      });
    }

    const lead = await db.recruiterLead.update({
      where: { id: leadId },
      data,
      include: {
        call_schedules: {
          orderBy: { created_at: "desc" },
        },
        call_logs: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_LEAD_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const leadId = Number(id);

    // Verify lead belongs to this recruiter
    const existing = await db.recruiterLead.findFirst({
      where: { id: leadId, recruiter_user_id: userId, is_active: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Soft-delete
    const lead = await db.recruiterLead.update({
      where: { id: leadId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_LEAD_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
