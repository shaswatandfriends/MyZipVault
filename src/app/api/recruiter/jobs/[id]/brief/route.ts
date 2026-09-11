import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/jobs/[id]/brief
 *
 * Returns a job's title + description + key fields so the recruiter can
 * auto-load them into the "Invite Candidate" email composer.
 *
 * Auth: any recruiter role (client_recruiter, client_admin, super_admin).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin", "super_admin"].includes(userRole)) {
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
        title: true,
        description: true,
        profession: true,
        specialty: true,
        city: true,
        state: true,
        is_remote: true,
        salary_display: true,
        is_bonus: true,
        bonus_amount: true,
        status: true,
        close_date: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "open") {
      return NextResponse.json({ error: `Job is not open (status: ${job.status})` }, { status: 400 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("[JOB_BRIEF_GET]", error);
    return NextResponse.json({ error: "Failed to fetch job brief" }, { status: 500 });
  }
}
