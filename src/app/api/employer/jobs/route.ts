import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/employer/jobs
 *   List the employer's own job postings only (posted_by_user_id = this user).
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
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = { posted_by_user_id: userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { ilike: `%${search}%` } },
        { specialty: { ilike: `%${search}%` } },
      ];
    }

    const [jobs, total] = await Promise.all([
      db.jobPosting.findMany({
        where,
        include: { _count: { select: { submissions: true } } },
        orderBy: { created_at: "desc" },
        take: 100,
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
        description: j.description,
        status: j.status,
        is_public: j.is_public,
        open_date: j.open_date,
        close_date: j.close_date,
        views_count: j.views_count,
        applications_count: j.applications_count,
        submissions_count: j._count.submissions,
        created_at: j.created_at,
        // Calculated split for display
        recruiter_payout_pct: 70,
        platform_fee_pct: 30,
      })),
      total,
    });
  } catch (error) {
    console.error("[EMPLOYER_JOBS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

/**
 * POST /api/employer/jobs
 *   Employer creates a new job posting. Auto-sets posted_by_user_id and
 *   organization_id from the session. Employer sets the commission.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = parseInt(session.user.id as string, 10);
    const organizationId = (session.user as Record<string, unknown>).organization_id as number | undefined;

    const body = await request.json();
    const {
      title, profession, specialty, job_title, employment_type,
      city, state, is_remote,
      salary_min, salary_max, salary_display,
      commission_type, commission_amount, commission_percentage,
      description, requirements, nice_to_have,
      status, is_public, open_date, close_date,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json({ error: "Title is required (min 3 chars)" }, { status: 400 });
    }

    // Employer must set a commission
    if (!commission_type || !["flat", "percentage"].includes(commission_type)) {
      return NextResponse.json({ error: "Commission type (flat or percentage) is required" }, { status: 400 });
    }
    if (commission_type === "flat" && (!commission_amount || commission_amount <= 0)) {
      return NextResponse.json({ error: "Commission amount must be > 0 for flat fee" }, { status: 400 });
    }
    if (commission_type === "percentage" && (!commission_percentage || commission_percentage <= 0)) {
      return NextResponse.json({ error: "Commission percentage must be > 0" }, { status: 400 });
    }

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
        commission_type,
        commission_amount: commission_amount ? parseFloat(commission_amount) : null,
        commission_percentage: commission_percentage ? parseFloat(commission_percentage) : null,
        description: description || null,
        requirements: requirements ? JSON.stringify(requirements) : null,
        nice_to_have: nice_to_have ? JSON.stringify(nice_to_have) : null,
        status: status || "open", // employer jobs go straight to open
        is_public: is_public ?? true, // default public so candidates can apply
        open_date: open_date ? new Date(open_date) : null,
        close_date: close_date ? new Date(close_date) : null,
        posted_by_user_id: userId,
        organization_id: organizationId ?? null,
      },
    });

    try {
      await logAudit({
        userId, role,
        action: "employer_posted_job",
        entityType: "job_posting", entityId: job.id,
        details: `Employer posted "${job.title}" with ${commission_type} commission of ${commission_type === "flat" ? `$${commission_amount}` : `${commission_percentage}%`}`,
      });
    } catch (e) { console.error("[AUDIT]", e); }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("[EMPLOYER_JOBS_CREATE]", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
