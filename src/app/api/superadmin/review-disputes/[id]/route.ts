import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * PUT /api/superadmin/review-disputes/[id] — resolve a dispute
 *
 * Body:
 *   - resolution: 'review_kept' | 'review_removed' | 'review_annotated' | 'recruiter_warned'
 *   - admin_notes: string
 *   - admin_annotation: string (shown publicly under the review IF resolution='review_annotated')
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin" && role !== "platform_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { id } = await params;
    const disputeId = parseInt(id, 10);
    if (isNaN(disputeId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { resolution, admin_notes, admin_annotation } = body;

    const validResolutions = ["review_kept", "review_removed", "review_annotated", "recruiter_warned"];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
    }

    const dispute = await db.recruiterReviewDispute.findUnique({
      where: { id: disputeId },
      select: { id: true, review_id: true, recruiter_user_id: true, reason_category: true },
    });
    if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

    const now = new Date();

    // Update the dispute
    const updated = await db.recruiterReviewDispute.update({
      where: { id: disputeId },
      data: {
        status: resolution === "review_removed" ? "removed" : resolution === "review_annotated" ? "annotated" : "upheld",
        admin_user_id: adminId,
        admin_notes: admin_notes || null,
        resolution,
        admin_annotation: resolution === "review_annotated" ? (admin_annotation || null) : null,
        resolved_at: now,
      },
    });

    // Update the review based on resolution
    const reviewUpdate: Record<string, unknown> = { dispute_status: updated.status };
    if (resolution === "review_removed") {
      reviewUpdate.status = "removed";
      reviewUpdate.has_dispute = true;
    } else if (resolution === "review_annotated") {
      reviewUpdate.admin_annotation = admin_annotation || null;
      reviewUpdate.has_dispute = true;
    } else {
      reviewUpdate.has_dispute = true;
    }

    await db.recruiterReview.update({
      where: { id: dispute.review_id },
      data: reviewUpdate,
    });

    try {
      await logAudit({
        userId: adminId, role,
        action: "dispute_resolved",
        entityType: "recruiter_review_dispute", entityId: disputeId,
        details: `Dispute #${disputeId} resolved — Resolution: ${resolution}. Review #${dispute.review_id}.`,
      });
    } catch (e) { console.error("[AUDIT]", e); }

    return NextResponse.json({ success: true, dispute: updated });
  } catch (error) {
    console.error("[DISPUTE_RESOLVE]", error);
    return NextResponse.json({ error: "Failed to resolve dispute" }, { status: 500 });
  }
}
