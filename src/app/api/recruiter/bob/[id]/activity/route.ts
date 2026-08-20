import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { onNoteAdded, logActivity } from "@/lib/bob/status-engine";

/**
 * GET /api/recruiter/bob/[id]/activity
 *
 * Fetch the full activity timeline for a lead.
 * Returns activities in chronological order (newest first).
 *
 * Query params:
 *   - limit: max results (default: 100, max: 500)
 *   - offset: pagination offset (default: 0)
 *   - type: filter by activity_type
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
      select: { id: true, recruiter_user_id: true, organization_id: true, pipeline_stage: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // ─── Visibility check ────────────────────────────────────────
    if (role !== "super_admin") {
      const isOwner = lead.recruiter_user_id === userId;
      const isInOrg = lead.organization_id === orgId;
      const isCompanyPool = ["inactive", "not_interested", "blacklisted"].includes(lead.pipeline_stage);
      const isAdmin = role === "client_admin";

      if (!isInOrg || (!isOwner && !isCompanyPool && !isAdmin)) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100") || 100, 500);
    const offset = parseInt(searchParams.get("offset") ?? "0") || 0;
    const typeFilter = searchParams.get("type");

    const where: any = { lead_id: leadId };
    if (typeFilter) {
      where.activity_type = typeFilter;
    }

    const [activities, total] = await Promise.all([
      db.recruiterLeadActivity.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
        include: {
          actor: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
      db.recruiterLeadActivity.count({ where }),
    ]);

    return NextResponse.json({
      activities,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[BOB ACTIVITY GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch activities" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recruiter/bob/[id]/activity
 *
 * Add a new activity to the timeline. Used for:
 *   - Adding notes (body.activity_type = "note_added", body.text = "the note")
 *   - Logging calls (body.activity_type = "call_logged", body.outcome = "left voicemail")
 *   - Custom activities (body.activity_type = "status_changed", body.description = "...")
 *
 * Body:
 *   - activity_type: string (required — must be a valid ActivityType)
 *   - text: string (for note_added)
 *   - outcome: string (for call_logged)
 *   - description: string (for custom activities)
 *   - metadata?: object
 */
export async function POST(
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

    const body = await request.json();

    if (!body.activity_type) {
      return NextResponse.json({ error: "activity_type required" }, { status: 400 });
    }

    // ─── Handle specific activity types ──────────────────────────
    if (body.activity_type === "note_added") {
      if (!body.text?.trim()) {
        return NextResponse.json({ error: "Note text required" }, { status: 400 });
      }
      await onNoteAdded({
        leadId,
        noteText: body.text.trim(),
        actorUserId: userId,
      });
    } else if (body.activity_type === "call_logged") {
      if (!body.outcome?.trim()) {
        return NextResponse.json({ error: "Call outcome required" }, { status: 400 });
      }
      await logActivity({
        leadId,
        activityType: "call_logged",
        description: `Call logged: ${body.outcome.trim()}`,
        actorUserId: userId,
        actorType: "recruiter",
        metadata: { outcome: body.outcome.trim(), notes: body.notes },
      });
    } else {
      // Custom activity
      if (!body.description?.trim()) {
        return NextResponse.json({ error: "description required" }, { status: 400 });
      }
      await logActivity({
        leadId,
        activityType: body.activity_type,
        description: body.description.trim(),
        actorUserId: userId,
        actorType: "recruiter",
        metadata: body.metadata ?? {},
      });
    }

    // Return the latest activity
    const latest = await db.recruiterLeadActivity.findFirst({
      where: { lead_id: leadId },
      orderBy: { created_at: "desc" },
      include: {
        actor: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return NextResponse.json({ activity: latest }, { status: 201 });
  } catch (error: any) {
    console.error("[BOB ACTIVITY POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add activity" },
      { status: 500 },
    );
  }
}
