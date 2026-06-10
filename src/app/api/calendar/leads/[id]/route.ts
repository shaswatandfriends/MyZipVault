import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get single lead with all relations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = Number(id);

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId, is_deleted: false },
      include: {
        recruiter_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        organization: { select: { id: true, name: true } },
        linked_candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
        call_schedules: {
          include: { call_logs: true, follow_up_reminders: { orderBy: { scheduled_for: "asc" } } },
          orderBy: { created_at: "desc" },
        },
        call_logs: { orderBy: { called_at: "desc" } },
        follow_up_reminders: { orderBy: { scheduled_for: "asc" } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check access: owner recruiter or client_admin in same org
    if (userRole === "client_recruiter" && lead.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (userRole === "client_admin" && lead.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[CALENDAR_LEAD_GET]", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

// PUT: Update lead
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = Number(id);

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId, is_deleted: false },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check access
    if (userRole === "client_recruiter" && lead.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (userRole === "client_admin" && lead.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      "first_name", "last_name", "phone", "email", "job_title", "specialty",
      "reached_for", "source", "source_other", "star_rating", "pipeline_stage",
      "is_no_longer_interested", "remark",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If is_no_longer_interested set to true, cancel all pending reminders
    if (body.is_no_longer_interested === true) {
      await db.followUpReminder.updateMany({
        where: { lead_id: leadId, status: "pending" },
        data: { status: "dismissed" },
      });
    }

    const updatedLead = await db.recruiterLead.update({
      where: { id: leadId },
      data: updateData,
      include: {
        recruiter_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        linked_candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
        call_schedules: true,
        call_logs: true,
        follow_up_reminders: true,
      },
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error("[CALENDAR_LEAD_PUT]", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

// DELETE: Soft delete lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = Number(id);

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId, is_deleted: false },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check access
    if (userRole === "client_recruiter" && lead.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (userRole === "client_admin" && lead.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete
    await db.recruiterLead.update({
      where: { id: leadId },
      data: { is_deleted: true },
    });

    // Cancel all pending reminders
    await db.followUpReminder.updateMany({
      where: { lead_id: leadId, status: "pending" },
      data: { status: "dismissed" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALENDAR_LEAD_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
