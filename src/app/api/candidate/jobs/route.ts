import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/candidate/jobs
 *
 * List public job postings for candidates to browse (Indeed-style).
 *
 * CRITICAL: This route MUST strip out recruiter-side fields:
 *   - salary_min, salary_max (raw numbers)
 *   - commission_amount, commission_percentage, commission_type
 *   - posted_by_user_id, organization_id
 *   - applications_count, submissions_count (internal metrics)
 *
 * Candidates only see:
 *   - title, profession, specialty, job_title, employment_type
 *   - city, state, is_remote
 *   - salary_display (e.g., "$200k" — recruiter formats this)
 *   - description, requirements, nice_to_have (as parsed JSON arrays)
 *   - open_date, close_date
 *
 * Query params:
 *   - search: search by title/specialty/job_title
 *   - profession: filter by profession
 *   - state: filter by state
 *   - is_remote: "true" to filter remote-only
 *   - page: pagination (default 1)
 *   - pageSize: page size (default 25, max 100)
 *
 * Auth: candidate role only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const profession = searchParams.get("profession")?.trim() || "";
    const state = searchParams.get("state")?.trim().toUpperCase() || "";
    const isRemote = searchParams.get("is_remote") === "true";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10), 10), 100);

    // Build where clause — candidates only see PUBLIC + OPEN jobs
    const where: Record<string, unknown> = {
      is_public: true,
      status: "open",
    };

    if (profession) where.profession = profession;
    if (state) where.state = state;
    if (isRemote) where.is_remote = true;
    if (search) {
      where.OR = [
        { title: { ilike: `%${search}%` } },
        { specialty: { ilike: `%${search}%` } },
        { job_title: { ilike: `%${search}%` } },
      ];
    }

    // Filter out jobs that have already closed
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { close_date: null },
      { close_date: { gte: new Date() } },
    ];

    const [jobs, total] = await Promise.all([
      db.jobPosting.findMany({
        where,
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
          salary_display: true,
          description: true,
          requirements: true,
          nice_to_have: true,
          open_date: true,
          close_date: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.jobPosting.count({ where }),
    ]);

    // Get the candidate's existing application IDs so the UI can show
    // "Already Applied" badges
    const userId = parseInt(session.user.id as string, 10);
    const myApplications = await db.candidateSubmission.findMany({
      where: {
        submission_type: "self_apply",
        // Find by candidate_record where claimed_by_user_id = this user
        candidate_record: { claimed_by_user_id: userId },
      },
      select: { job_id: true, status: true },
    });
    const appliedJobIds = new Set(myApplications.map((a) => a.job_id));

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
        salary_display: j.salary_display,
        description: j.description,
        requirements: j.requirements ? safeParseArray(j.requirements) : null,
        nice_to_have: j.nice_to_have ? safeParseArray(j.nice_to_have) : null,
        open_date: j.open_date,
        close_date: j.close_date,
        created_at: j.created_at,
        has_applied: appliedJobIds.has(j.id),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[CANDIDATE_JOBS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
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
