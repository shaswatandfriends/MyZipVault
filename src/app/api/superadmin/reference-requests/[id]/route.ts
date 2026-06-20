import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/superadmin/reference-requests/[id] — Approve or reject a deletion request
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    const userId = Number(session.user.id);

    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const requestId = Number(id);

    const body = await request.json();
    const { action, reviewNotes } = body; // action: "approve" or "reject"

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const deletionRequest = await db.referenceDeletionRequest.findUnique({
      where: { id: requestId },
      include: {
        reference: {
          select: {
            id: true,
            manager_email: true,
            facility_name: true,
            consent_shares: { where: { is_deleted: false } },
          },
        },
      },
    });

    if (!deletionRequest) {
      return NextResponse.json({ error: "Deletion request not found" }, { status: 404 });
    }

    if (deletionRequest.status !== "pending") {
      return NextResponse.json({ error: "This request has already been reviewed" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update the deletion request
    await db.referenceDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewed_by: userId,
        review_notes: reviewNotes?.trim() || null,
        reviewed_at: new Date(),
      },
    });

    // If approved, delete the reference and its related data
    if (action === "approve") {
      // Mark all consent shares for this reference as deleted
      if (deletionRequest.reference.consent_shares.length > 0) {
        await db.consentShare.updateMany({
          where: { reference_id: deletionRequest.reference_id, is_deleted: false },
          data: { is_deleted: true },
        });
      }

      // Delete reference responses first (cascade)
      await db.referenceResponse.deleteMany({
        where: { candidate_reference_id: deletionRequest.reference_id },
      });

      // Delete the reference itself
      await db.candidateReference.delete({
        where: { id: deletionRequest.reference_id },
      });
    }

    // Notify the candidate
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId: deletionRequest.candidate_user_id,
      category: "compliance",
      priority: "important",
      title: action === "approve" ? "Reference Deleted" : "Deletion Request Rejected",
      message: action === "approve"
        ? `Your request to delete the reference from ${deletionRequest.reference.facility_name} has been approved. The reference has been permanently removed.`
        : `Your request to delete the reference from ${deletionRequest.reference.facility_name} has been rejected.${reviewNotes ? ` Reason: ${reviewNotes.trim().substring(0, 150)}` : ""}`,
      relatedEntityId: requestId,
      relatedEntityType: "reference_deletion_request",
    });

    return NextResponse.json({
      success: true,
      message: action === "approve"
        ? "Reference deletion approved and completed"
        : "Reference deletion request rejected",
    });
  } catch (error) {
    console.error("Superadmin reference request review error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
