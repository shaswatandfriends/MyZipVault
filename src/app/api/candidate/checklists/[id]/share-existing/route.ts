import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/candidate/checklists/[id]/share-existing
//
// Called when a candidate clicks "Approve Share" on a `reuse_pending`
// checklist request. This:
//   1. Validates the request is in `reuse_pending` status and belongs to
//      the candidate.
//   2. Validates the linked existing response is still valid
//      (status=active, valid_until >= now, not superseded).
//   3. Creates a ConsentShare linking the existing response to the
//      requesting recruiter, with a candidate-chosen expiry (default 30
//      days, options 7/14/30/90/custom).
//   4. Transitions the ChecklistRequest to `completed` status.
//   5. Marks the in-app notification (if any) as read.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const requestId = Number(id);
    const body = await request.json().catch(() => ({}));
    const expiryDays = Math.max(
      1,
      Math.min(365, Number(body.expiryDays) || 30)
    );

    // Fetch the request
    let checklistRequest: any = null;
    try {
      checklistRequest = await db.checklistRequest.findUnique({
        where: { id: requestId },
        include: {
          candidate_response: true,
        },
      });
    } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist request not found" },
        { status: 404 }
      );
    }

    if (checklistRequest.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (checklistRequest.status !== "reuse_pending") {
      return NextResponse.json(
        {
          error: `This request is not pending consent (status: ${checklistRequest.status})`,
        },
        { status: 400 }
      );
    }

    const existingResponse = checklistRequest.candidate_response;
    if (!existingResponse) {
      return NextResponse.json(
        { error: "No existing response linked to this request" },
        { status: 400 }
      );
    }

    // Validate the existing response is still shareable
    const now = new Date();
    if (existingResponse.status !== "active") {
      return NextResponse.json(
        {
          error:
            "The existing checklist is no longer active. Please complete a new one.",
          code: "RESPONSE_NOT_ACTIVE",
        },
        { status: 400 }
      );
    }
    if (existingResponse.valid_until < now) {
      return NextResponse.json(
        {
          error:
            "The existing checklist has expired. Please complete a new one.",
          code: "RESPONSE_EXPIRED",
        },
        { status: 400 }
      );
    }
    if (existingResponse.superseded_by_id !== null) {
      return NextResponse.json(
        {
          error:
            "This checklist has been superseded by a newer completion. Please complete a new one.",
          code: "RESPONSE_SUPERSEDED",
        },
        { status: 400 }
      );
    }

    // Create the ConsentShare
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
    await db.consentShare.create({
      data: {
        candidate_user_id: userId,
        client_user_id: checklistRequest.client_user_id,
        checklist_response_id: existingResponse.id,
        shared_at: now,
        expires_at: expiresAt,
      },
    });

    // Mark the request as completed
    await db.checklistRequest.update({
      where: { id: requestId },
      data: {
        status: "completed",
        completion_pct: 100,
      },
    });

    // Mark the related in-app notification as read (if any)
    await db.notification.updateMany({
      where: {
        user_id: userId,
        related_entity_id: requestId,
        related_entity_type: "checklist_request",
        is_read: false,
      },
      data: { is_read: true },
    });

    return NextResponse.json({
      success: true,
      message: "Checklist shared successfully",
      expiresAt,
    });
  } catch (error) {
    console.error("[SHARE_EXISTING_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to share existing checklist" },
      { status: 500 }
    );
  }
}
