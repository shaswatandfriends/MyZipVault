import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/submissions
 *
 * List all candidate submissions across all jobs/recruiters. Superadmin
 * can see everything for oversight.
 *
 * Filters: status, recruiter_user_id, job_id, submission_type
 * Search: by candidate name or job title
 * Pagination: page, pageSize
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim() || "";
    const recruiterId = searchParams.get("recruiter_user_id")?.trim() || "";
    const jobId = searchParams.get("job_id")?.trim() || "";
    const submissionType = searchParams.get("submission_type")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "50", 10), 10), 200);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (recruiterId) where.recruiter_user_id = parseInt(recruiterId, 10);
    if (jobId) where.job_id = parseInt(jobId, 10);
    if (submissionType) where.submission_type = submissionType;

    if (search) {
      where.OR = [
        { candidate_record: { first_name: { ilike: `%${search}%` } } },
        { candidate_record: { last_name: { ilike: `%${search}%` } } },
        { job: { title: { ilike: `%${search}%` } } },
      ];
    }

    const [submissions, total] = await Promise.all([
      db.candidateSubmission.findMany({
        where,
        include: {
          candidate_record: {
            select: {
              id: true, first_name: true, last_name: true,
              specialty: true, profession: true, source: true,
            },
          },
          job: {
            select: { id: true, title: true, commission_type: true, commission_amount: true, commission_percentage: true, salary_max: true, salary_min: true },
          },
          recruiter: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          organization: {
            select: { id: true, name: true },
          },
          rtr_document: {
            select: { id: true, status: true, title: true },
          },
        },
        orderBy: { submitted_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.candidateSubmission.count({ where }),
    ]);

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        submitted_at_ms: s.submitted_at_ms.toString(),
        submitted_at: s.submitted_at,
        status: s.status,
        submission_type: s.submission_type,
        payout_split_phase: s.payout_split_phase,
        rtr_signed_at: s.rtr_signed_at,
        rtr_document_id: s.rtr_document?.id ?? null,
        rtr_document_status: s.rtr_document?.status ?? null,
        recruiter_notes: s.recruiter_notes,
        // Revenue
        placement_fee: s.placement_fee,
        recruiter_payout: s.recruiter_payout,
        platform_payout: s.platform_payout,
        original_owner_residual: s.original_owner_residual,
        placed_at: s.placed_at,
        // Relations
        candidate: {
          id: s.candidate_record.id,
          fullName: [s.candidate_record.first_name, s.candidate_record.last_name].filter(Boolean).join(" ") || "—",
          specialty: s.candidate_record.specialty,
          profession: s.candidate_record.profession,
          source: s.candidate_record.source,
        },
        job: {
          id: s.job.id,
          title: s.job.title,
          commission_type: s.job.commission_type,
          commission_amount: s.job.commission_amount,
          commission_percentage: s.job.commission_percentage,
          salary_max: s.job.salary_max,
          salary_min: s.job.salary_min,
        },
        recruiter: s.recruiter
          ? {
              id: s.recruiter.id,
              name: [s.recruiter.first_name, s.recruiter.last_name].filter(Boolean).join(" ") || s.recruiter.email,
              email: s.recruiter.email,
            }
          : null,
        organization: s.organization?.name ?? null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[SUBMISSIONS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
