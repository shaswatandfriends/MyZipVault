import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/public/recruiter/[publicId]
 *
 * Public recruiter profile — NO AUTH REQUIRED (anyone can view).
 * Returns recruiter info + reputation score + recent reviews (active only).
 *
 * If the viewer is logged in as the recruiter who owns this profile, the
 * response also includes:
 *   - viewer_is_recruiter: true
 *   - per-review `viewer_can_reply` (true if no reply yet)
 *   - per-review `viewer_can_dispute` (true if review is negative and no
 *     dispute has been filed yet)
 *   - per-review `has_dispute` and `dispute_status` (for display)
 *
 * Hides:
 *   - email (privacy)
 *   - phone
 *   - password_hash
 *   - any internal IDs (only public_id exposed)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    // Optional auth — if the viewer is logged in, we use their session to
    // compute viewer_is_recruiter and viewer_can_reply/dispute flags.
    // If not logged in, all those flags are false (and that's fine —
    // the page just won't show Reply/Dispute buttons).
    const session = await getServerSession(authOptions);
    const viewerUserId = session?.user ? parseInt((session.user as Record<string, unknown>).id as string, 10) || null : null;

    // Find the recruiter by public_id (UUID)
    const recruiter = await db.user.findFirst({
      where: {
        public_id: publicId,
        role: { in: ["client_recruiter", "client_admin"] },
        account_status: { in: ["active", "suspended"] }, // show even if suspended
      },
      select: {
        id: true,
        public_id: true,
        first_name: true,
        last_name: true,
        role: true,
        account_status: true,
        organization_id: true,
        organization: { select: { id: true, name: true } },
      },
    });

    if (!recruiter) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    // Determine if the viewer IS the recruiter being viewed (for reply/dispute UI)
    const viewerIsRecruiter = viewerUserId !== null && viewerUserId === recruiter.id;

    // Get reputation score (may not exist yet)
    const reputation = await db.recruiterReputationScore.findUnique({
      where: { recruiter_user_id: recruiter.id },
    });

    // Get recent reviews (active status only, max 10)
    // Include has_dispute and dispute_status so we can show the right UI
    const reviews = await db.recruiterReview.findMany({
      where: {
        recruiter_user_id: recruiter.id,
        status: "active",
      },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        reviewer_role: true,
        professionalism: true,
        communication: true,
        job_match: true,
        process_speed: true,
        post_placement: true,
        comment: true,
        is_anonymous: true,
        is_verified_placement: true,
        recruiter_reply: true,
        recruiter_replied_at: true,
        admin_annotation: true,
        has_dispute: true,
        dispute_status: true,
        created_at: true,
      },
    });

    // Get public job postings from this recruiter's org (if any)
    const publicJobs = await db.jobPosting.findMany({
      where: {
        organization_id: recruiter.organization_id ?? undefined,
        status: "open",
        is_public: true,
      },
      select: {
        id: true,
        public_id: true,
        title: true,
        specialty: true,
        city: true,
        state: true,
        is_remote: true,
        salary_display: true,
        employment_type: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    // Calculate average score (if reputation doesn't exist yet, calculate from reviews)
    let overallScore = reputation?.overall_score ? parseFloat(String(reputation.overall_score)) : 0;
    let totalReviews = reputation?.total_reviews ?? reviews.length;
    let verifiedReviews = reputation?.verified_reviews ?? 0;

    if (!reputation && reviews.length > 0) {
      // Quick average (not the full cron calculation, just for display)
      const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((s, x) => s + x, 0) / arr.length;
      overallScore = avg(reviews.map((r) =>
        (r.professionalism + r.communication + r.job_match + r.process_speed + r.post_placement) / 5
      ));
      verifiedReviews = reviews.filter((r) => r.is_verified_placement).length;
    }

    return NextResponse.json({
      recruiter: {
        public_id: recruiter.public_id,
        full_name: [recruiter.first_name, recruiter.last_name].filter(Boolean).join(" ") || "Recruiter",
        role: recruiter.role === "client_admin" ? "Client Admin" : "Recruiter",
        organization: recruiter.organization?.name ?? null,
        account_status: recruiter.account_status,
      },
      reputation: reputation
        ? {
            overall_score: parseFloat(String(reputation.overall_score)),
            professionalism_avg: parseFloat(String(reputation.professionalism_avg)),
            communication_avg: parseFloat(String(reputation.communication_avg)),
            job_match_avg: parseFloat(String(reputation.job_match_avg)),
            process_speed_avg: parseFloat(String(reputation.process_speed_avg)),
            post_placement_avg: parseFloat(String(reputation.post_placement_avg)),
            total_reviews: totalReviews,
            verified_reviews: verifiedReviews,
            total_placements: reputation.total_placements,
            avg_time_to_fill_days: reputation.avg_time_to_fill_days ? parseFloat(String(reputation.avg_time_to_fill_days)) : null,
            candidate_retention_pct: reputation.candidate_retention_pct ? parseFloat(String(reputation.candidate_retention_pct)) : null,
            badge_tier: reputation.badge_tier,
            is_top_recruiter: reputation.is_top_recruiter,
            is_verified_recruiter: reputation.is_verified_recruiter,
          }
        : {
            overall_score: overallScore,
            total_reviews: totalReviews,
            verified_reviews: verifiedReviews,
            badge_tier: "none",
            is_top_recruiter: false,
            is_verified_recruiter: false,
          },
      reviews: reviews.map((r) => {
        // Determine whether the review is "negative" (any sub-score ≤ 5)
        // — only negative reviews can be disputed
        const isNegative = [r.professionalism, r.communication, r.job_match, r.process_speed, r.post_placement].some((v) => v <= 5);

        // The viewer can reply if: they ARE the recruiter AND no reply exists yet
        // The viewer can dispute if: they ARE the recruiter AND review is negative
        //   AND no dispute has been filed yet
        const viewerCanReply = viewerIsRecruiter && !r.recruiter_reply;
        const viewerCanDispute = viewerIsRecruiter && isNegative && !r.has_dispute;

        return {
          id: r.id,
          reviewer_role: r.reviewer_role,
          professionalism: r.professionalism,
          communication: r.communication,
          job_match: r.job_match,
          process_speed: r.process_speed,
          post_placement: r.post_placement,
          // Average score for display
          avg_score: ((r.professionalism + r.communication + r.job_match + r.process_speed + r.post_placement) / 5).toFixed(1),
          comment: r.comment,
          is_anonymous: r.is_anonymous,
          is_verified_placement: r.is_verified_placement,
          recruiter_reply: r.recruiter_reply,
          recruiter_replied_at: r.recruiter_replied_at,
          admin_annotation: r.admin_annotation,
          // New fields for reply/dispute UI
          has_dispute: r.has_dispute,
          dispute_status: r.dispute_status, // null | 'pending' | 'upheld' | 'dismissed' | 'review_removed'
          is_negative: isNegative,
          viewer_can_reply: viewerCanReply,
          viewer_can_dispute: viewerCanDispute,
          created_at: r.created_at,
        };
      }),
      // Top-level flag: is the viewer the recruiter being viewed?
      viewer_is_recruiter: viewerIsRecruiter,
      public_jobs: publicJobs.map((j) => ({
        id: j.id,
        public_id: j.public_id,
        title: j.title,
        specialty: j.specialty,
        city: j.city,
        state: j.state,
        is_remote: j.is_remote,
        salary_display: j.salary_display,
        employment_type: j.employment_type,
        created_at: j.created_at,
      })),
    });
  } catch (error) {
    console.error("[PUBLIC_RECRUITER_PROFILE]", error);
    return NextResponse.json({ error: "Failed to fetch recruiter profile" }, { status: 500 });
  }
}
