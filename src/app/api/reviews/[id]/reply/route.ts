import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/reviews/[id]/reply
 *
 * Recruiter replies to a review on their profile. One reply per review,
 * cannot be edited (Glassdoor-style — the recruiter's defense is final).
 *
 * Auth: the logged-in user must be the recruiter who was reviewed
 * (review.recruiter_user_id === session.user.id).
 *
 * Body:
 *   - reply: string (max 300 chars, required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const { id } = await params;
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId)) {
      return NextResponse.json({ error: "Invalid review ID" }, { status: 400 });
    }

    const body = await request.json();
    const { reply } = body;

    if (!reply || typeof reply !== "string" || reply.trim().length < 10) {
      return NextResponse.json({ error: "Reply must be at least 10 characters" }, { status: 400 });
    }
    if (reply.length > 300) {
      return NextResponse.json({ error: "Reply must be at most 300 characters" }, { status: 400 });
    }

    // Find the review
    const review = await db.recruiterReview.findUnique({
      where: { id: reviewId },
      select: { id: true, recruiter_user_id: true, recruiter_reply: true, status: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Only the reviewed recruiter can reply
    if (review.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "Only the reviewed recruiter can reply to this review" }, { status: 403 });
    }

    // Can't reply if review is removed
    if (review.status === "removed") {
      return NextResponse.json({ error: "This review has been removed and cannot be replied to" }, { status: 400 });
    }

    // Can't reply twice (no editing)
    if (review.recruiter_reply) {
      return NextResponse.json({ error: "You have already replied to this review. Replies cannot be edited." }, { status: 409 });
    }

    // Set the reply
    const updated = await db.recruiterReview.update({
      where: { id: reviewId },
      data: {
        recruiter_reply: reply.trim(),
        recruiter_replied_at: new Date(),
      },
      select: { id: true, recruiter_reply: true, recruiter_replied_at: true },
    });

    // Audit log
    try {
      await logAudit({
        userId,
        role: (session.user as Record<string, unknown>).role as string,
        action: "review_reply_submitted",
        entityType: "recruiter_review",
        entityId: reviewId,
        details: `Replied to review #${reviewId}: "${reply.trim().substring(0, 100)}..."`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log review reply:", auditErr);
    }

    return NextResponse.json({
      success: true,
      review_id: reviewId,
      reply: updated.recruiter_reply,
      replied_at: updated.recruiter_replied_at,
      message: "Reply posted. It will appear publicly under the review.",
    }, { status: 201 });
  } catch (error) {
    console.error("[REVIEW_REPLY]", error);
    return NextResponse.json({ error: "Failed to post reply" }, { status: 500 });
  }
}
