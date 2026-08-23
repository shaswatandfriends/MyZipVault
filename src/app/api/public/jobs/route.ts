import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/jobs
 *
 * PUBLIC job board — accessible without authentication.
 * Used by the /jobs landing page so anyone can browse open healthcare jobs.
 *
 * CRITICAL: This route MUST strip out ALL internal fields:
 *   - salary_min, salary_max (raw numbers)
 *   - commission_amount, commission_percentage, commission_type
 *   - posted_by_user_id, organization_id
 *   - applications_count, submissions_count (internal metrics)
 *
 * Public visitors only see:
 *   - id, public_id, title, profession, specialty, job_title
 *   - employment_type, city, state, is_remote
 *   - salary_display (e.g., "$200k" — recruiter formats this)
 *   - description, requirements, nice_to_have (as parsed JSON arrays)
 *   - open_date, close_date, created_at
 *   - organization_name (employer's company name, for display)
 *
 * Query params:
 *   - search: search by title/specialty/job_title
 *   - profession: filter by profession
 *   - state: filter by state
 *   - is_remote: "true" to filter remote-only
 *   - employment_type: filter by employment type
 *   - page: pagination (default 1)
 *   - pageSize: page size (default 25, max 50)
 *
 * Auth: NONE — fully public. Rate limiting may be added later.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const profession = searchParams.get("profession")?.trim() || "";
    const state = searchParams.get("state")?.trim().toUpperCase() || "";
    const employmentType = searchParams.get("employment_type")?.trim() || "";
    const isRemote = searchParams.get("is_remote") === "true";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10), 10), 50);

    // Build where clause — public visitors only see PUBLIC + OPEN jobs that haven't closed
    const where: Record<string, unknown> = {
      is_public: true,
      status: "open",
      OR: [
        { close_date: null },
        { close_date: { gte: new Date() } },
      ],
    };

    if (profession) where.profession = profession;
    if (state) where.state = state;
    if (employmentType) where.employment_type = employmentType;
    if (isRemote) where.is_remote = true;
    if (search) {
      // Combine the search OR with the close_date OR
      where.AND = [
        {
          OR: [
            { title: { ilike: `%${search}%` } },
            { specialty: { ilike: `%${search}%` } },
            { job_title: { ilike: `%${search}%` } },
            { profession: { ilike: `%${search}%` } },
          ],
        },
      ];
    }

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
          organization: {
            select: { name: true },
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
        salary_display: j.salary_display,
        // Truncate description for list view (full description only on detail page)
        description_preview: j.description
          ? j.description.length > 240
            ? j.description.slice(0, 240) + "…"
            : j.description
          : null,
        // Don't return full requirements/nice_to_have in list — only on detail page
        requirements_count: j.requirements ? (safeParseArray(j.requirements)?.length ?? 0) : 0,
        nice_to_have_count: j.nice_to_have ? (safeParseArray(j.nice_to_have)?.length ?? 0) : 0,
        open_date: j.open_date,
        close_date: j.close_date,
        created_at: j.created_at,
        organization_name: j.organization?.name ?? null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[PUBLIC_JOBS_LIST]", error);
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
