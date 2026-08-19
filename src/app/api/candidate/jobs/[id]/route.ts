import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/candidate/jobs/[id]
 *
 * Get a single public job posting for candidate view.
 *
 * Same field stripping as the list endpoint — NO commission info,
 * NO raw salary numbers, NO internal metrics.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await db.jobPosting.findUnique({
      where: { id: jobId },
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
        // NOTE: NO commission_amount, commission_percentage, commission_type,
        // salary_min, salary_max, posted_by_user_id, organization_id,
        // applications_count, submissions_count — these are recruiter-side only
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Hide non-public OR non-open jobs from candidates
    if (!job.is_public || job.status !== "open") {
      return NextResponse.json({ error: "Job not available" }, { status: 404 });
    }

    // Check if the close_date has passed
    if (job.close_date && new Date(job.close_date) < new Date()) {
      return NextResponse.json({ error: "Job posting has closed" }, { status: 404 });
    }

    // Check if the candidate already applied
    const userId = parseInt(session.user.id as string, 10);
    const existingApplication = await db.candidateSubmission.findFirst({
      where: {
        job_id: jobId,
        candidate_record: { claimed_by_user_id: userId },
      },
      select: { id: true, status: true, submitted_at: true },
    });

    // Increment views count (fire-and-forget, non-blocking)
    db.jobPosting.update({
      where: { id: jobId },
      data: { views_count: { increment: 1 } },
    }).catch((err) => console.error("[JOB_VIEW_INCREMENT]", err));

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
      },
      my_application: existingApplication
        ? {
            id: existingApplication.id,
            status: existingApplication.status,
            submitted_at: existingApplication.submitted_at,
          }
        : null,
    });
  } catch (error) {
    console.error("[CANDIDATE_JOB_DETAIL]", error);
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
