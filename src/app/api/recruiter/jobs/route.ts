import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/jobs
 *
 * List open jobs for recruiters to work on. Returns FULL job info
 * (including commission — recruiters need this to decide which jobs to work).
 *
 * Filters: search, profession, specialty, state, employment_type
 * Pagination: page, pageSize (default 25)
 *
 * Auth: client_recruiter or client_admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const profession = searchParams.get("profession")?.trim() || "";
    const specialty = searchParams.get("specialty")?.trim() || "";
    const state = searchParams.get("state")?.trim().toUpperCase() || "";
    const employmentType = searchParams.get("employment_type")?.trim() || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10), 10), 100);

    // Build where — only show OPEN jobs (not draft/paused/cancelled/filled)
    const where: Record<string, unknown> = { status: "open" };
    if (profession) where.profession = profession;
    if (state) where.state = state;
    if (employmentType) where.employment_type = employmentType;
    if (specialty) where.specialty = { ilike: `%${specialty}%` };
    if (search) {
      where.OR = [
        { title: { ilike: `%${search}%` } },
        { specialty: { ilike: `%${search}%` } },
        { job_title: { ilike: `%${search}%` } },
        { description: { ilike: `%${search}%` } },
      ];
    }

    // Filter out closed jobs
    const now = new Date();
    where.AND = [
      {
        OR: [
          { close_date: null },
          { close_date: { gte: now } },
        ],
      },
    ];

    const [jobs, total] = await Promise.all([
      db.jobPosting.findMany({
        where,
        include: {
          _count: { select: { submissions: true } },
          // Include this recruiter's submission count for this job (if any)
          submissions: {
            where: { recruiter_user_id: userId },
            select: { id: true, status: true, submitted_at: true },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.jobPosting.count({ where }),
    ]);

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        public_id: j.public_id,
        title: j.title,
        profession: j.profession,
        specialty: j.specialty,
        job_title: j.job_title,
        employment_type: j.employment_type,
        city: j.city,
        state: j.state,
        is_remote: j.is_remote,
        // Recruiter-side fields (candidates don't see these)
        salary_display: j.salary_display,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        commission_type: j.commission_type,
        commission_amount: j.commission_amount,
        commission_percentage: j.commission_percentage,
        description: j.description,
        requirements: j.requirements,
        nice_to_have: j.nice_to_have,
        open_date: j.open_date,
        close_date: j.close_date,
        created_at: j.created_at,
        // Submission stats
        total_submissions: j._count.submissions,
        my_submission: j.submissions[0]
          ? {
              id: j.submissions[0].id,
              status: j.submissions[0].status,
              submitted_at: j.submissions[0].submitted_at,
            }
          : null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[RECRUITER_JOBS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
