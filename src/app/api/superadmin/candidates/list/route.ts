import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/candidates/list
 *
 * List candidates from the CandidateRecord pool (the 1M healthcare data).
 *
 * Query params:
 *   - search: search by name/email/phone (normalized)
 *   - profession: filter by profession
 *   - specialty: filter by specialty
 *   - state: filter by state
 *   - source: filter by source ('platform_pool' | 'recruiter_submitted' | 'self_signup')
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
    const search = searchParams.get("search")?.trim() || "";
    const profession = searchParams.get("profession")?.trim() || "";
    const specialty = searchParams.get("specialty")?.trim() || "";
    const state = searchParams.get("state")?.trim().toUpperCase() || "";
    const source = searchParams.get("source")?.trim() || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "50", 10), 10), 200);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (profession) where.profession = profession;
    if (specialty) where.specialty = { ilike: `%${specialty}%` };
    if (state) where.state = state;
    if (source) where.source = source;

    // Search across name + contact info
    if (search) {
      where.OR = [
        { first_name: { ilike: `%${search}%` } },
        { last_name: { ilike: `%${search}%` } },
        // Search via contact info relation
        {
          contact_info: {
            some: { value_normalized: { ilike: `%${search.toLowerCase().trim()}%` } },
          },
        },
      ];
    }

    const [candidates, total] = await Promise.all([
      db.candidateRecord.findMany({
        where,
        include: {
          contact_info: {
            where: {
              is_primary: true,
              deleted_at: null,
              // Only show non-private contact info to other recruiters
              // (superadmin sees all)
            },
            orderBy: { added_at: "desc" },
          },
          ownership_windows: {
            where: { is_active: true },
            take: 1,
          },
          _count: {
            select: { submissions: true },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.candidateRecord.count({ where }),
    ]);

    return NextResponse.json({
      candidates: candidates.map((c) => ({
        id: c.id,
        public_id: c.public_id,
        firstName: c.first_name,
        lastName: c.last_name,
        fullName: [c.first_name, c.last_name].filter(Boolean).join(" "),
        city: c.city,
        state: c.state,
        jobTitle: c.job_title,
        specialty: c.specialty,
        profession: c.profession,
        yearsOfExperience: c.years_of_experience,
        licenseNumber: c.license_number,
        licenseState: c.license_state,
        npiNumber: c.npi_number,
        source: c.source,
        claimed: !!c.claimed_by_user_id,
        importedAt: c.imported_at,
        createdAt: c.created_at,
        primaryEmail: c.contact_info.find((ci) => ci.type === "email")?.value ?? null,
        primaryPhone: c.contact_info.find((ci) => ci.type === "phone")?.value ?? null,
        ownershipPhase: c.ownership_windows[0]?.current_phase ?? null,
        ownershipOwnerRecruiterId: c.ownership_windows[0]?.recruiter_user_id ?? null,
        submissionCount: c._count.submissions,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[CANDIDATE_LIST] Error:", error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
