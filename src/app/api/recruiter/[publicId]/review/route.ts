import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/recruiter/[publicId]/review
 *
 * Submit a review for a recruiter. Auth required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized — you must be logged in to review" }, { status: 401 });
    }

    const reviewerId = parseInt(session.user.id as string, 10);
    const reviewerRole = (session.user as Record<string, unknown>).role as string;
    const { publicId } = await params;

    const recruiter = await db.user.findFirst({
      where: { public_id: publicId, role: { in: ["client_recruiter", "client_admin"] } },
      select: { id: true, first_name: true, last_name: true },
    });
    if (!recruiter) return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    if (recruiter.id === reviewerId) return NextResponse.json({ error: "You cannot review yourself" }, { status: 400 });

    const body = await request.json();
    const { professionalism, communication, job_match, process_speed, post_placement, comment, is_anonymous } = body;

    for (const [field, value] of Object.entries({ professionalism, communication, job_match, process_speed, post_placement })) {
      if (typeof value !== "number" || value < 1 || value > 10 || !Number.isInteger(value)) {
        return NextResponse.json({ error: `${field} must be an integer between 1 and 10` }, { status: 400 });
      }
    }

    const isNegative = [professionalism, communication, job_match, process_speed, post_placement].some((v: number) => v <= 5);
    if (isNegative && (!comment || comment.trim().length < 50)) {
      return NextResponse.json({ error: "For ratings of 5 or below, a comment of at least 50 characters is required." }, { status: 400 });
    }

    // Check for verified placement
    let submissionId: number | null = null;
    let isVerifiedPlacement = false;
    const mySubmission = await db.candidateSubmission.findFirst({
      where: { recruiter_user_id: recruiter.id, candidate_record: { claimed_by_user_id: reviewerId } },
      orderBy: { submitted_at: "desc" },
      select: { id: true, status: true },
    });
    if (mySubmission) {
      submissionId = mySubmission.id;
      isVerifiedPlacement = !["submitted", "withdrawn"].includes(mySubmission.status);
    }

    // Check for existing review
    if (submissionId) {
      // Note: there's a partial unique index on (reviewer_user_id, submission_id) WHERE
      // reviewer_user_id IS NOT NULL in the DB, but Prisma cannot introspect partial indexes
      // so we can't use findUnique with reviewer_user_id_submission_id. Use findFirst instead.
      const existing = await db.recruiterReview.findFirst({
        where: { reviewer_user_id: reviewerId, submission_id: submissionId },
      });
      if (existing) return NextResponse.json({ error: "You have already reviewed this placement" }, { status: 409 });
    } else {
      const existingReview = await db.recruiterReview.findFirst({
        where: { reviewer_user_id: reviewerId, recruiter_user_id: recruiter.id },
      });
      if (existingReview) return NextResponse.json({ error: "You have already reviewed this recruiter" }, { status: 409 });
    }

    const review = await db.recruiterReview.create({
      data: {
        recruiter_user_id: recruiter.id,
        reviewer_user_id: is_anonymous ? null : reviewerId,
        reviewer_role: reviewerRole,
        professionalism, communication, job_match, process_speed, post_placement,
        comment: comment?.trim()?.substring(0, 500) || null,
        is_anonymous: !!is_anonymous,
        is_verified_placement: isVerifiedPlacement,
        status: "active",
        submission_id: submissionId,
      },
      select: { id: true },
    });

    try {
      await logAudit({
        userId: reviewerId, role: reviewerRole,
        action: "review_submitted",
        entityType: "recruiter_review", entityId: review.id,
        details: `Reviewed recruiter ${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""}${is_anonymous ? " [anonymous]" : ""}${isVerifiedPlacement ? " [verified]" : ""}`,
      });
    } catch (auditErr) { console.error("[AUDIT_LOG]", auditErr); }

    return NextResponse.json({
      success: true, review_id: review.id, is_verified: isVerifiedPlacement,
      message: isVerifiedPlacement ? "Review submitted (verified)." : "Review submitted (unverified — carries less weight).",
    }, { status: 201 });
  } catch (error) {
    console.error("[REVIEW_SUBMIT]", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
