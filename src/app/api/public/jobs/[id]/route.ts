import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/public/jobs/[id]
 *
 * PUBLIC job detail — accessible without authentication.
 * Used by the /browse-jobs/[id] public job detail page.
 *
 * If the viewer is logged in as a candidate, the response ALSO includes:
 *   - has_applied (boolean)
 *   - application_status (string | null)
 *   - application_id (number | null) — so the candidate can see the link to their application
 *
 * Path params:
 *   - id: job id (integer) OR public_id (UUID string)
 *
 * Auth: NONE — fully public.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Optional auth — viewer may be a logged-in candidate (in which case we
    // include has_applied flags), recruiter, employer, or anonymous.
    const session = await getServerSession(authOptions);
    const viewerUserId = session?.user ? parseInt((session.user as Record<string, unknown>).id as string, 10) || null : null;
    const viewerRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
    const viewerIsCandidate = viewerRole === "candidate" && viewerUserId !== null;

    const { id } = await params;

    // Try to parse as integer (job id) — if that fails, treat as public_id (UUID)
    const numericId = parseInt(id, 10);
    const isNumeric = !isNaN(numericId) && String(numericId) === id;

    const job = await db.jobPosting.findUnique({
      where: isNumeric ? { id: numericId } : { public_id: id },
      select: {
        id: true,
        public_id: true,
        title: true,
        profession: true,
        specialty: true,
        job_title: true,
        employment_type: true,
        city: true,
        state: true,
        is_remote: true,
        is_public: true,
        status: true,
        salary_display: true,
        description: true,
        requirements: true,
        nice_to_have: true,
        open_date: true,
        close_date: true,
        created_at: true,
        views_count: true,
        applications_count: true,
        organization: {
          select: { name: true, company_website: true },
        },
        // NOTE: NO commission_amount, commission_percentage, commission_type,
        // salary_min, salary_max, posted_by_user_id, organization_id,
        // submissions_count — these are internal-only
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If the job is private or not open, don't show it to the public
    if (!job.is_public || job.status !== "open") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If the job has closed, still show it but flag it
    const isClosed = job.close_date !== null && new Date(job.close_date) < new Date();

    // If the viewer is a logged-in candidate, look up their application to this job
    let hasApplied = false;
    let applicationStatus: string | null = null;
    let applicationId: number | null = null;
    if (viewerIsCandidate) {
      try {
        const myApplication = await db.candidateSubmission.findFirst({
          where: {
            job_id: job.id,
            candidate_record: { claimed_by_user_id: viewerUserId },
          },
          select: { id: true, status: true, submitted_at: true },
        });
        if (myApplication) {
          hasApplied = true;
          applicationStatus = myApplication.status;
          applicationId = myApplication.id;
        }
      } catch {
        // Schema mismatch or query fails — skip; treat as not-applied
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        public_id: job.public_id,
        title: job.title,
        profession: job.profession,
        specialty: job.specialty,
        job_title: job.job_title,
        employment_type: job.employment_type,
        city: job.city,
        state: job.state,
        is_remote: job.is_remote,
        salary_display: job.salary_display,
        description: job.description,
        requirements: job.requirements ? safeParseArray(job.requirements) : null,
        nice_to_have: job.nice_to_have ? safeParseArray(job.nice_to_have) : null,
        open_date: job.open_date,
        close_date: job.close_date,
        created_at: job.created_at,
        // Aggregate metrics (safe to show publicly — they're on the listing page already)
        views_count: job.views_count,
        applications_count: job.applications_count,
        organization_name: job.organization?.name ?? null,
        organization_website: job.organization?.company_website ?? null,
        is_closed: isClosed,
        // Candidate-specific fields (null for non-candidate viewers)
        has_applied: hasApplied,
        application_status: applicationStatus,
        application_id: applicationId,
      },
      // Top-level viewer info
      viewer_role: viewerRole ?? null,
      viewer_is_candidate: viewerIsCandidate,
    });
  } catch (error) {
    console.error("[PUBLIC_JOB_DETAIL]", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

// Helper to safely parse JSON arrays stored as text
function safeParseArray(jsonStr: string): string[] | null {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}
