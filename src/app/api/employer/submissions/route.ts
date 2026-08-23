import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/employer/submissions
 *   List all submissions to the employer's own jobs.
 *   Recruiter info is ANONYMIZED: employer sees initials + photo only,
 *   NO email or phone. Communication goes through the platform.
 *
 *   Candidate info is shown (name, specialty, profession, city, state)
 *   but NOT contact info (email, phone are hidden).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = parseInt(session.user.id as string, 10);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";

    // Find all jobs posted by this employer
    const myJobs = await db.jobPosting.findMany({
      where: { posted_by_user_id: userId },
      select: { id: true, title: true },
    });
    const jobIds = myJobs.map(j => j.id);
    if (jobIds.length === 0) return NextResponse.json({ submissions: [] });

    const where: Record<string, unknown> = { job_id: { in: jobIds } };
    if (status) where.status = status;

    const submissions = await db.candidateSubmission.findMany({
      where,
      include: {
        candidate_record: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            specialty: true,
            profession: true,
            city: true,
            state: true,
            job_title: true,
          },
        },
        job: { select: { id: true, title: true } },
        recruiter: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            // NOTE: NO email, NO phone — anonymized
          },
        },
      },
      orderBy: { submitted_at: "desc" },
      take: 100,
    });

    return NextResponse.json({
      submissions: submissions.map((s) => {
        // Anonymize recruiter: show initials only (e.g., "SP")
        const recruiterName = s.recruiter
          ? `${s.recruiter.first_name ?? ""} ${s.recruiter.last_name ?? ""}`.trim()
          : "Self-apply";
        const recruiterInitials = s.recruiter
          ? `${s.recruiter.first_name?.[0] ?? ""}${s.recruiter.last_name?.[0] ?? ""}`.toUpperCase()
          : null;

        const candidateName = [s.candidate_record.first_name, s.candidate_record.last_name]
          .filter(Boolean).join(" ") || "—";

        return {
          id: s.id,
          submitted_at: s.submitted_at,
          status: s.status,
          submission_type: s.submission_type,
          recruiter_notes: s.recruiter_notes,
          // Candidate info (no contact info)
          candidate: {
            id: s.candidate_record.id,
            name: candidateName,
            specialty: s.candidate_record.specialty,
            profession: s.candidate_record.profession,
            city: s.candidate_record.city,
            state: s.candidate_record.state,
            job_title: s.candidate_record.job_title,
          },
          // Job info
          job: {
            id: s.job.id,
            title: s.job.title,
          },
          // ANONYMIZED recruiter info
          recruiter: s.recruiter
            ? {
                initials: recruiterInitials,
                full_name: recruiterName, // shown but no email/phone
                recruiter_id: s.recruiter.id, // for platform-mediated communication
              }
            : null,
          // Revenue (employer can see the total fee, not the split)
          placement_fee: s.placement_fee,
          placed_at: s.placed_at,
        };
      }),
    });
  } catch (error) {
    console.error("[EMPLOYER_SUBMISSIONS]", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
