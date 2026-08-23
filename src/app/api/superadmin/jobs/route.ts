import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/superadmin/jobs
 *   List all job postings (superadmin sees everything including commission).
 *
 * Query params:
 *   - status: filter by status (draft, open, paused, filled, cancelled)
 *   - profession: filter by profession
 *   - search: search by title/specialty
 *   - page: pagination (default 1)
 *   - pageSize: page size (default 50, max 200)
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
    const profession = searchParams.get("profession")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "50", 10), 10), 200);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (profession) where.profession = profession;
    if (search) {
      where.OR = [
        { title: { ilike: `%${search}%` } },
        { specialty: { ilike: `%${search}%` } },
        { job_title: { ilike: `%${search}%` } },
      ];
    }

    const [jobs, total] = await Promise.all([
      db.jobPosting.findMany({
        where,
        include: {
          posted_by: { select: { id: true, first_name: true, last_name: true, email: true } },
          organization: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
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
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        commission_type: j.commission_type,
        commission_amount: j.commission_amount,
        commission_percentage: j.commission_percentage,
        status: j.status,
        is_public: j.is_public,
        open_date: j.open_date,
        close_date: j.close_date,
        posted_by: j.posted_by
          ? `${j.posted_by.first_name ?? ""} ${j.posted_by.last_name ?? ""}`.trim() || j.posted_by.email
          : null,
        organization: j.organization?.name ?? null,
        views_count: j.views_count,
        applications_count: j.applications_count,
        submissions_count: j._count.submissions,
        created_at: j.created_at,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[JOBS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/jobs
 *   Create a new job posting.
 *
 * Body:
 *   - title (required)
 *   - profession, specialty, job_title, employment_type (optional)
 *   - city, state, is_remote (optional)
 *   - salary_min, salary_max, salary_display (optional)
 *   - commission_type ('flat' | 'percentage')
 *   - commission_amount (if flat)
 *   - commission_percentage (if percentage)
 *   - description, requirements (JSON array), nice_to_have (JSON array)
 *   - status ('draft' | 'open'), is_public (boolean)
 *   - open_date, close_date (ISO dates)
 *   - organization_id (optional — the employer, if applicable)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      profession,
      specialty,
      job_title,
      employment_type,
      city,
      state,
      is_remote,
      salary_min,
      salary_max,
      salary_display,
      commission_type,
      commission_amount,
      commission_percentage,
      description,
      requirements,
      nice_to_have,
      status,
      is_public,
      open_date,
      close_date,
      organization_id,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json({ error: "Title is required (min 3 chars)" }, { status: 400 });
    }

    const adminUserId = parseInt((session.user as Record<string, unknown>).id as string, 10);

    const job = await db.jobPosting.create({
      data: {
        title: title.trim(),
        profession: profession || null,
        specialty: specialty || null,
        job_title: job_title || null,
        employment_type: employment_type || null,
        city: city || null,
        state: state ? state.toUpperCase() : null,
        is_remote: is_remote ?? false,
        salary_min: salary_min ? parseFloat(salary_min) : null,
        salary_max: salary_max ? parseFloat(salary_max) : null,
        salary_display: salary_display || null,
        commission_type: commission_type || null,
        commission_amount: commission_amount ? parseFloat(commission_amount) : null,
        commission_percentage: commission_percentage ? parseFloat(commission_percentage) : null,
        description: description || null,
        requirements: requirements ? JSON.stringify(requirements) : null,
        nice_to_have: nice_to_have ? JSON.stringify(nice_to_have) : null,
        status: status || "draft",
        is_public: is_public ?? false,
        open_date: open_date ? new Date(open_date) : null,
        close_date: close_date ? new Date(close_date) : null,
        posted_by_user_id: adminUserId,
        organization_id: organization_id || null,
      },
    });

    try {
      await logAudit({
        userId: adminUserId,
        role: userRole,
        action: "job_posting_created",
        entityType: "job_posting",
        entityId: job.id,
        details: `Created job "${job.title}" (${job.status}, ${job.is_public ? "public" : "private"})`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log job creation:", auditErr);
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("[JOBS_CREATE]", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
