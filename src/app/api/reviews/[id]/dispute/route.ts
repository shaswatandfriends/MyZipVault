import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/reviews/[id]/dispute
 *
 * Recruiter disputes a negative review (any sub-score ≤5/10). Creates a
 * RecruiterReviewDispute record that goes to the superadmin moderation
 * queue. One dispute per review.
 *
 * Auth: the logged-in user must be the recruiter who was reviewed.
 *
 * Body:
 *   - reason_category: 'false_claim' | 'wrong_recruiter' | 'vindictive' |
 *     'factually_incorrect' | 'policy_violation' | 'other'
 *   - explanation: string (min 100 chars, max 1000)
 *   - evidence_urls: JSON array of doc links (optional)
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
    const { reason_category, explanation, evidence_urls } = body;

    const validReasons = ["false_claim", "wrong_recruiter", "vindictive", "factually_incorrect", "policy_violation", "other"];
    if (!reason_category || !validReasons.includes(reason_category)) {
      return NextResponse.json({ error: "Invalid reason category" }, { status: 400 });
    }
    if (!explanation || typeof explanation !== "string" || explanation.trim().length < 100) {
      return NextResponse.json({ error: "Explanation must be at least 100 characters" }, { status: 400 });
    }

    // Find the review
    const review = await db.recruiterReview.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        recruiter_user_id: true,
        professionalism: true,
        communication: true,
        job_match: true,
        process_speed: true,
        post_placement: true,
        has_dispute: true,
        status: true,
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Only the reviewed recruiter can dispute
    if (review.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "Only the reviewed recruiter can dispute this review" }, { status: 403 });
    }

    // Can only dispute negative reviews (any sub-score ≤5/10)
    const isNegative = [review.professionalism, review.communication, review.job_match, review.process_speed, review.post_placement].some((v) => v <= 5);
    if (!isNegative) {
      return NextResponse.json({ error: "Disputes are only available for reviews with a rating of 5 or below. This review doesn't qualify." }, { status: 400 });
    }

    // Can't dispute if review is removed
    if (review.status === "removed") {
      return NextResponse.json({ error: "This review has been removed — no dispute needed." }, { status: 400 });
    }

    // One dispute per review
    if (review.has_dispute) {
      return NextResponse.json({ error: "This review has already been disputed. Check the dispute status." }, { status: 409 });
    }

    // Check for existing dispute record
    const existingDispute = await db.recruiterReviewDispute.findUnique({
      where: { review_id: reviewId },
    });
    if (existingDispute) {
      return NextResponse.json({ error: "A dispute already exists for this review", dispute_status: existingDispute.status }, { status: 409 });
    }

    // Create the dispute
    const dispute = await db.recruiterReviewDispute.create({
      data: {
        review_id: reviewId,
        recruiter_user_id: userId,
        reason_category,
        explanation: explanation.trim().substring(0, 1000),
        evidence_urls: evidence_urls ? JSON.stringify(evidence_urls) : null,
        status: "pending",
      },
      select: { id: true },
    });

    // Update the review to show it has a dispute
    await db.recruiterReview.update({
      where: { id: reviewId },
      data: {
        has_dispute: true,
        dispute_status: "pending",
      },
    });

    // Audit log
    try {
      await logAudit({
        userId,
        role: (session.user as Record<string, unknown>).role as string,
        action: "review_dispute_filed",
        entityType: "recruiter_review",
        entityId: reviewId,
        details: `Disputed review #${reviewId} — Reason: ${reason_category}. Dispute #${dispute.id}.`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log dispute:", auditErr);
    }

    return NextResponse.json({
      success: true,
      dispute_id: dispute.id,
      review_id: reviewId,
      status: "pending",
      message: "Dispute filed. Our team will review it and may remove, annotate, or keep the review based on the evidence provided.",
    }, { status: 201 });
  } catch (error) {
    console.error("[REVIEW_DISPUTE]", error);
    return NextResponse.json({ error: "Failed to file dispute" }, { status: 500 });
  }
}
