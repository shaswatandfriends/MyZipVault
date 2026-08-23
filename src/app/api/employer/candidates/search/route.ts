import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/employer/candidates/search
 *
 * Search the healthcare candidate pool (same as recruiter search but
 * for employers). Employers buy credits to reveal contact info.
 *
 * Same ownership window logic as recruiter search — employers see
 * the same candidate pool but from the employer perspective.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "employer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = parseInt(session.user.id as string, 10);
    const organizationId = (session.user as Record<string, unknown>).organization_id as number | undefined;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const profession = searchParams.get("profession")?.trim() || "";
    const specialty = searchParams.get("specialty")?.trim() || "";
    const state = searchParams.get("state")?.trim().toUpperCase() || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10), 10), 100);

    const where: Record<string, unknown> = {};
    if (profession) where.profession = profession;
    if (state) where.state = state;
    if (specialty) where.specialty = { ilike: `%${specialty}%` };
    if (search) {
      where.OR = [
        { first_name: { ilike: `%${search}%` } },
        { last_name: { ilike: `%${search}%` } },
        { contact_info: { some: { value_normalized: { ilike: `%${search.toLowerCase().trim()}%` } } } },
      ];
    }

    // Filter out candidates in other recruiters' exclusive windows
    where.NOT = {
      AND: [
        { source: "recruiter_submitted" },
        { ownership_windows: { some: { is_active: true, current_phase: "exclusive" } } },
      ],
    };

    const now = new Date();

    const [candidates, total] = await Promise.all([
      db.candidateRecord.findMany({
        where,
        include: {
          contact_info: { where: { deleted_at: null }, orderBy: { added_at: "desc" } },
          ownership_windows: { where: { is_active: true }, take: 1 },
          _count: { select: { submissions: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.candidateRecord.count({ where }),
    ]);

    // Check if THIS employer has revealed contact info
    const candidateIds = candidates.map((c) => c.id);
    const myReveals = await db.candidateContactReveal.findMany({
      where: {
        recruiter_user_id: userId, // reuse the same reveal table
        candidate_record_id: { in: candidateIds },
        is_expired: false,
        expires_at: { gte: now },
      },
      select: { candidate_record_id: true },
    });
    const revealedSet = new Set(myReveals.map((r) => r.candidate_record_id));

    return NextResponse.json({
      candidates: candidates.map((c) => {
        const ownershipWindow = c.ownership_windows[0];
        const ownershipPhase = ownershipWindow?.current_phase ?? "open";
        const hasRevealed = revealedSet.has(c.id);
        const isPlatformPool = c.source === "platform_pool";
        const isSelfSignup = c.source === "self_signup";
        const contactInfoHidden = c.source === "recruiter_submitted" && ownershipPhase === "exclusive";

        const primaryEmail = c.contact_info.find((ci) => ci.type === "email" && ci.is_primary);
        const primaryPhone = c.contact_info.find((ci) => ci.type === "phone" && ci.is_primary);

        return {
          id: c.id,
          public_id: c.public_id,
          fullName: [c.first_name, c.last_name].filter(Boolean).join(" ") || "—",
          city: c.city, state: c.state,
          jobTitle: c.job_title, specialty: c.specialty, profession: c.profession,
          source: c.source,
          ownership_phase: ownershipPhase,
          has_revealed: hasRevealed,
          primary_email: (hasRevealed || isPlatformPool || isSelfSignup) && !contactInfoHidden ? primaryEmail?.value ?? null : null,
          primary_phone: (hasRevealed || isPlatformPool || isSelfSignup) && !contactInfoHidden ? primaryPhone?.value ?? null : null,
          contact_info_locked: contactInfoHidden,
          submission_count: c._count.submissions,
          created_at: c.created_at,
        };
      }),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[EMPLOYER_CANDIDATE_SEARCH]", error);
    return NextResponse.json({ error: "Failed to search candidates" }, { status: 500 });
  }
}
