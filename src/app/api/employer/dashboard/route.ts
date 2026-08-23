import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/employer/dashboard
 *
 * Returns real dashboard data for the logged-in employer:
 *   - stats: { activeJobs, totalJobs, totalSubmissions, placedCount, totalSpend, pendingReview, interviewsScheduled, totalCredits }
 *   - jobs: top 5 active jobs with submission counts + status
 *   - recentSubmissions: last 10 submissions across all of the employer's jobs
 *   - submissionsByStatus: { submitted, reviewing, interview, offer, placed, rejected, withdrawn }
 *   - recentActivity: activity feed (job posted, submission received, status changed)
 *
 * Recruiter info is ANONYMIZED — employer sees initials only, no email/phone.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number(session.user.id);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    // ── 1. All jobs posted by this employer ──
    // Employers post jobs with posted_by_user_id = their user id.
    // Also scope by organization_id if the employer belongs to an org.
    const jobsWhere = organizationId
      ? { OR: [{ posted_by_user_id: userId }, { organization_id: organizationId }] }
      : { posted_by_user_id: userId };

    const allJobs = await db.jobPosting.findMany({
      where: jobsWhere,
      select: {
        id: true,
        title: true,
        status: true,
        profession: true,
        specialty: true,
        city: true,
        state: true,
        commission_amount: true,
        commission_type: true,
        views_count: true,
        applications_count: true,
        submissions_count: true,
        created_at: true,
        open_date: true,
      },
      orderBy: { created_at: "desc" },
    });

    const jobIds = allJobs.map((j) => j.id);
    const activeJobs = allJobs.filter((j) => j.status === "open").length;

    // ── 2. All submissions to those jobs ──
    type SubmissionRow = {
      id: number;
      status: string;
      submitted_at: Date;
      placement_fee: { toString(): string } | null;
      recruiter_payout: { toString(): string } | null;
      candidate_record: {
        id: number;
        first_name: string | null;
        last_name: string | null;
        specialty: string | null;
        profession: string | null;
      };
      job: { id: number; title: string };
      recruiter: { id: number; first_name: string | null; last_name: string | null } | null;
    };

    let submissions: SubmissionRow[] = [];

    if (jobIds.length > 0) {
      submissions = await db.candidateSubmission.findMany({
        where: { job_id: { in: jobIds } },
        select: {
          id: true,
          status: true,
          submitted_at: true,
          placement_fee: true,
          recruiter_payout: true,
          candidate_record: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              specialty: true,
              profession: true,
            },
          },
          job: { select: { id: true, title: true } },
          recruiter: {
            select: { id: true, first_name: true, last_name: true },
          },
        },
        orderBy: { submitted_at: "desc" },
        take: 100,
      });
    }

    // ── 3. Submissions by status ──
    const submissionsByStatus: Record<string, number> = {
      submitted: 0,
      reviewing: 0,
      interview: 0,
      offer: 0,
      placed: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const s of submissions) {
      if (submissionsByStatus[s.status] !== undefined) {
        submissionsByStatus[s.status]++;
      }
    }

    // ── 4. Placed count + total spend ──
    const placedSubmissions = submissions.filter((s) => s.status === "placed");
    const placedCount = placedSubmissions.length;
    const totalSpend = placedSubmissions.reduce((sum, s) => {
      if (s.placement_fee === null) return sum;
      const numFee = Number(s.placement_fee.toString());
      return sum + (isNaN(numFee) ? 0 : numFee);
    }, 0);

    // ── 5. Recent submissions (last 10) ──
    const recentSubmissions = submissions.slice(0, 10).map((s) => {
      const candidateName = [s.candidate_record.first_name, s.candidate_record.last_name]
        .filter(Boolean).join(" ") || "—";
      const recruiterInitials = s.recruiter
        ? `${s.recruiter.first_name?.[0] ?? ""}${s.recruiter.last_name?.[0] ?? ""}`.toUpperCase()
        : null;
      return {
        id: s.id,
        submitted_at: s.submitted_at,
        status: s.status,
        candidate: {
          id: s.candidate_record.id,
          name: candidateName,
          specialty: s.candidate_record.specialty,
          profession: s.candidate_record.profession,
        },
        job: { id: s.job.id, title: s.job.title },
        recruiter: s.recruiter
          ? { initials: recruiterInitials, recruiter_id: s.recruiter.id }
          : null,
      };
    });

    // ── 6. Top 5 active jobs (by submissions_count desc) ──
    const topJobs = allJobs
      .filter((j) => j.status !== "cancelled" && j.status !== "filled")
      .sort((a, b) => b.submissions_count - a.submissions_count)
      .slice(0, 5)
      .map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        profession: j.profession,
        specialty: j.specialty,
        city: j.city,
        state: j.state,
        views: j.views_count,
        applications: j.applications_count,
        submissions: j.submissions_count,
        commission_amount: j.commission_amount !== null ? Number(j.commission_amount) : null,
        commission_type: j.commission_type,
        created_at: j.created_at,
        open_date: j.open_date,
      }));

    // ── 7. Credit balance ──
    let totalCredits = 0;
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { credits_balance: true },
      });
      totalCredits = user?.credits_balance ?? 0;
    } catch {
      totalCredits = 0;
    }

    // ── 8. Recent activity feed ──
    type Activity = {
      type: "job_posted" | "submission_received" | "placement_made";
      timestamp: Date;
      data: Record<string, unknown>;
    };
    const activities: Activity[] = [];

    allJobs.slice(0, 5).forEach((j) => {
      activities.push({
        type: "job_posted",
        timestamp: j.created_at,
        data: { job_id: j.id, job_title: j.title, status: j.status },
      });
    });

    recentSubmissions.forEach((s) => {
      activities.push({
        type: s.status === "placed" ? "placement_made" : "submission_received",
        timestamp: new Date(s.submitted_at),
        data: {
          submission_id: s.id,
          candidate_name: s.candidate.name,
          job_id: s.job.id,
          job_title: s.job.title,
          recruiter_initials: s.recruiter?.initials ?? "Self",
          status: s.status,
        },
      });
    });

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivity = activities.slice(0, 12);

    // ── 9. Final payload ──
    return NextResponse.json({
      stats: {
        totalJobs: allJobs.length,
        activeJobs,
        totalSubmissions: submissions.length,
        placedCount,
        totalSpend,
        pendingReview: submissionsByStatus.submitted + submissionsByStatus.reviewing,
        interviewsScheduled: submissionsByStatus.interview,
        offersExtended: submissionsByStatus.offer,
        totalCredits,
      },
      submissionsByStatus,
      jobs: topJobs,
      recentSubmissions,
      recentActivity,
      hasJobs: allJobs.length > 0,
    });
  } catch (error) {
    console.error("[EMPLOYER_DASHBOARD]", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
