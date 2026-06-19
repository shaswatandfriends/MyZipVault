import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { onLeadCreated } from "@/lib/bob/status-engine";
import { ALL_STATUSES, COMPANY_POOL_STATUSES, SOURCE_OPTIONS, type CandidateStatus } from "@/lib/bob/types";

/**
 * GET /api/recruiter/bob
 *
 * List recruiter leads (BOB — Book of Business).
 *
 * Query params:
 *   - view: "my_bob" | "company_pool" | "all"   (default: my_bob)
 *       my_bob       = leads owned by current recruiter (excludes company pool)
 *       company_pool = leads any recruiter can claim (status in inactive/not_interested/blacklisted)
 *       all          = admin only — all recruiters' BOB + company pool in their org
 *   - status: filter by single status (e.g. ?status=interested)
 *   - tag: filter by tag (hot/warm/cold/inactive)
 *   - source: filter by source
 *   - search: text search on first_name, last_name, email, phone
 *   - sort: "last_activity" | "created_at" | "name"  (default: last_activity)
 *   - limit: max results (default: 100, max: 500)
 *
 * Visibility rules:
 *   - client_recruiter: sees own BOB + company_pool (NOT other recruiters' BOB)
 *   - client_admin: sees all recruiters' BOB in org + company_pool
 *   - super_admin: sees everything (across all orgs)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") ?? "my_bob") as "my_bob" | "company_pool" | "all";
    const statusFilter = searchParams.get("status");
    const tagFilter = searchParams.get("tag");
    const sourceFilter = searchParams.get("source");
    const search = searchParams.get("search")?.trim();
    const sort = searchParams.get("sort") ?? "last_activity";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100") || 100, 500);

    // ─── Build where clause ──────────────────────────────────────
    const where: any = { AND: [] };

    // View filter
    if (view === "my_bob") {
      // Own BOB = leads owned by this recruiter, EXCLUDING company pool statuses
      where.AND.push({
        recruiter_user_id: userId,
        pipeline_stage: { notIn: COMPANY_POOL_STATUSES },
      });
    } else if (view === "company_pool") {
      // Company Pool = leads in this org with a company-pool status
      if (!orgId && role !== "super_admin") {
        return NextResponse.json({ error: "No organization" }, { status: 400 });
      }
      where.AND.push({
        organization_id: orgId ?? undefined,
        pipeline_stage: { in: COMPANY_POOL_STATUSES },
      });
    } else if (view === "all") {
      // Admin only — all leads in org
      if (role === "client_recruiter") {
        return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
      }
      if (role !== "super_admin") {
        where.AND.push({ organization_id: orgId });
      }
    }

    // Status filter
    if (statusFilter && ALL_STATUSES.includes(statusFilter as CandidateStatus)) {
      where.AND.push({ pipeline_stage: statusFilter });
    }

    // Tag filter
    if (tagFilter && ["hot", "warm", "cold", "inactive"].includes(tagFilter)) {
      where.AND.push({ tag: tagFilter });
    }

    // Source filter
    if (sourceFilter) {
      where.AND.push({ source: sourceFilter });
    }

    // Search filter
    if (search) {
      where.AND.push({
        OR: [
          { first_name: { contains: search, mode: "insensitive" } },
          { last_name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    // ─── Build order by ──────────────────────────────────────────
    let orderBy: any;
    switch (sort) {
      case "created_at":
        orderBy = { created_at: "desc" };
        break;
      case "name":
        orderBy = [{ first_name: "asc" }, { last_name: "asc" }];
        break;
      case "last_activity":
      default:
        orderBy = { last_activity_at: "desc" };
        break;
    }

    // ─── Query ────────────────────────────────────────────────────
    const leads = await db.recruiterLead.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        recruiter_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        candidate_user: {
          select: { id: true, first_name: true, last_name: true, email: true, email_verified_at: true },
        },
        _count: {
          select: {
            activities: true,
            vault_sign_documents: true,
            call_schedules: true,
            call_logs: true,
          },
        },
      },
    });

    // ─── Compute summary stats ───────────────────────────────────
    const stats = {
      total: leads.length,
      by_status: {} as Record<string, number>,
      by_tag: { hot: 0, warm: 0, cold: 0, inactive: 0 } as Record<string, number>,
      active: 0,
      in_pool: 0,
    };

    for (const lead of leads) {
      stats.by_status[lead.pipeline_stage] = (stats.by_status[lead.pipeline_stage] ?? 0) + 1;
      stats.by_tag[lead.tag] = (stats.by_tag[lead.tag] ?? 0) + 1;
      if (COMPANY_POOL_STATUSES.includes(lead.pipeline_stage as any)) {
        stats.in_pool++;
      } else {
        stats.active++;
      }
    }

    return NextResponse.json({
      leads,
      stats,
      view,
      filters: {
        status: statusFilter,
        tag: tagFilter,
        source: sourceFilter,
        search,
        sort,
      },
    });
  } catch (error: any) {
    console.error("[BOB LIST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recruiter/bob
 *
 * Create a new lead (candidate enters the recruiter's BOB).
 *
 * Body:
 *   - first_name: string (required)
 *   - last_name: string (required)
 *   - email?: string
 *   - phone?: string
 *   - job_title?: string
 *   - specialty?: string
 *   - reached_for?: string (what position/role they were contacted for)
 *   - remark?: string (how the call went)
 *   - source: string (required — one of SOURCE_OPTIONS or "other" + source_other)
 *   - source_other?: string (required if source === "other")
 *   - pipeline_stage?: string (default: new_lead)
 *
 * The lead is automatically owned by the current recruiter and assigned to their org.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!orgId && role !== "super_admin") {
      return NextResponse.json({ error: "No organization assigned" }, { status: 400 });
    }

    const body = await request.json();

    // ─── Validate ────────────────────────────────────────────────
    if (!body.first_name?.trim() || !body.last_name?.trim()) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    if (!body.source) {
      return NextResponse.json({ error: "Source is required" }, { status: 400 });
    }

    const validSources = SOURCE_OPTIONS.map((s) => s.value);
    if (!validSources.includes(body.source)) {
      return NextResponse.json({ error: `Invalid source: ${body.source}` }, { status: 400 });
    }

    if (body.source === "other" && !body.source_other?.trim()) {
      return NextResponse.json({ error: "Source name required when source is 'other'" }, { status: 400 });
    }

    // ─── Check for duplicate (same email + same org) ─────────────
    if (body.email?.trim()) {
      const existing = await db.recruiterLead.findFirst({
        where: {
          email: { equals: body.email.trim(), mode: "insensitive" },
          organization_id: orgId ?? undefined,
        },
        select: { id: true, first_name: true, last_name: true, pipeline_stage: true, recruiter_user_id: true },
      });

      if (existing) {
        return NextResponse.json({
          error: "A lead with this email already exists in your organization",
          existing_lead: existing,
        }, { status: 409 });
      }
    }

    // ─── Determine source value ─────────────────────────────────
    let sourceValue = body.source;
    if (body.source === "other" && body.source_other) {
      // Store as "other:custom_name" so we can report on it
      sourceValue = `other:${body.source_other.trim().slice(0, 50)}`;
    }

    // ─── Create lead ─────────────────────────────────────────────
    const lead = await db.recruiterLead.create({
      data: {
        recruiter_user_id: userId,
        organization_id: orgId ?? 0,
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        job_title: body.job_title?.trim() || null,
        specialty: body.specialty?.trim() || null,
        reached_for: body.reached_for?.trim() || null,
        remark: body.remark?.trim() || null,
        source: sourceValue,
        pipeline_stage: body.pipeline_stage || "new_lead",
        // New BOB fields
        tag: "hot", // Just created = active
        last_activity_at: new Date(),
        last_activity_type: "lead_created",
        notes: body.notes?.trim() || null,
      },
    });

    // ─── Log lead_created activity ───────────────────────────────
    await onLeadCreated({
      leadId: lead.id,
      actorUserId: userId,
      source: sourceValue,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error: any) {
    console.error("[BOB CREATE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create lead" },
      { status: 500 },
    );
  }
}
