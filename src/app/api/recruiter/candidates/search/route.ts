import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/candidates/search
 *
 * Search the platform candidate pool (the 1M healthcare records).
 *
 * OWNERSHIP WINDOW LOGIC:
 *   - During 0-90 day 'exclusive' phase: only the OWNER recruiter can see
 *     the candidate. Other recruiters don't see it in their search results.
 *   - During 90-180 day 'residual' phase: all recruiters can see the
 *     candidate. The 2% residual is auto-deducted from new submissions.
 *   - After 180 days: standard 70/30 split, no residual.
 *
 * CONTACT INFO VISIBILITY:
 *   - Platform pool records (source='platform_pool'): email + phone visible
 *     to all recruiters (these came with the platform data, no ownership)
 *   - Recruiter-submitted records (source='recruiter_submitted'):
 *     during exclusive phase, contact info is hidden from other recruiters.
 *     During residual phase, all contact info becomes visible.
 *
 * Returns:
 *   - id, public_id, name, city, state, job_title, specialty, profession
 *   - source (pool | recruiter_submitted | self_signup)
 *   - ownership_phase (exclusive | residual | open) — relative to caller
 *   - is_owner (true if this recruiter is the current owner)
 *   - has_revealed (true if this recruiter has paid to reveal contact info)
 *   - primary_email + primary_phone (only shown if revealed or if platform pool)
 *
 * Filters: search, profession, specialty, state, source, ownership_phase
 * Pagination: page, pageSize (default 25)
 *
 * Query param: jobId — if provided, pre-checks which candidates are already
 * submitted to this job (returns has_submitted flag).
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

    const userId = parseInt(session.user.id as string, 10);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const profession = searchParams.get("profession")?.trim() || "";
    const specialty = searchParams.get("specialty")?.trim() || "";
    const state = searchParams.get("state")?.trim().toUpperCase() || "";
    const sourceFilter = searchParams.get("source")?.trim() || "";
    const ownershipPhaseFilter = searchParams.get("ownership_phase")?.trim() || "";
    const jobIdParam = searchParams.get("jobId")?.trim() || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "25", 10), 10), 100);

    // Build base where clause
    const where: Record<string, unknown> = {};

    if (profession) where.profession = profession;
    if (state) where.state = state;
    if (sourceFilter) where.source = sourceFilter;
    if (specialty) where.specialty = { ilike: `%${specialty}%` };

    // Search across name + contact info
    if (search) {
      where.OR = [
        { first_name: { ilike: `%${search}%` } },
        { last_name: { ilike: `%${search}%` } },
        { contact_info: { some: { value_normalized: { ilike: `%${search.toLowerCase().trim()}%` } } } },
      ];
    }

    // ─── Ownership window scoping ─────────────────────────────────────
    // We need to FILTER OUT candidates that are in another recruiter's
    // EXCLUSIVE window (0-90 days). Candidates in the RESIDUAL phase or
    // OPEN phase are visible to all recruiters.
    //
    // Strategy: query CandidateRecords with a NOT condition on ownership_windows:
    //   NOT (some active ownership_window with current_phase='exclusive'
    //        AND recruiter_user_id != me)
    //
    // For pool records (source='platform_pool'), there's no ownership window
    // at all, so they're always visible.

    const now = new Date();

    // Build the ownership exclusion
    where.NOT = {
      AND: [
        { source: "recruiter_submitted" }, // only recruiter-submitted have ownership
        {
          ownership_windows: {
            some: {
              is_active: true,
              current_phase: "exclusive",
              recruiter_user_id: { not: userId },
            },
          },
        },
      ],
    };

    // If filtering by ownership_phase, we need to scope to that phase
    // (only meaningful for recruiter-submitted records owned by this user)
    if (ownershipPhaseFilter === "mine_exclusive") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          ownership_windows: {
            some: { is_active: true, current_phase: "exclusive", recruiter_user_id: userId },
          },
        },
      ];
    } else if (ownershipPhaseFilter === "mine_residual") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          ownership_windows: {
            some: { is_active: true, current_phase: "residual", recruiter_user_id: userId },
          },
        },
      ];
    }

    const [candidates, total] = await Promise.all([
      db.candidateRecord.findMany({
        where,
        include: {
          contact_info: {
            where: { deleted_at: null },
            orderBy: { added_at: "desc" },
          },
          ownership_windows: {
            where: { is_active: true },
            take: 1,
          },
          _count: { select: { submissions: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.candidateRecord.count({ where }),
    ]);

    // If jobId is provided, pre-fetch which candidates are already submitted to it
    let alreadySubmittedIds = new Set<number>();
    if (jobIdParam) {
      const jobId = parseInt(jobIdParam, 10);
      if (!isNaN(jobId)) {
        const existingSubs = await db.candidateSubmission.findMany({
          where: { job_id: jobId },
          select: { candidate_record_id: true, status: true, recruiter_user_id: true },
        });
        alreadySubmittedIds = new Set(existingSubs.map((s) => s.candidate_record_id));
      }
    }

    // For each candidate, check if THIS recruiter has revealed contact info
    const candidateIds = candidates.map((c) => c.id);
    const myReveals = await db.candidateContactReveal.findMany({
      where: {
        recruiter_user_id: userId,
        candidate_record_id: { in: candidateIds },
        is_expired: false,
        expires_at: { gte: now },
      },
      select: { candidate_record_id: true },
    });
    const revealedSet = new Set(myReveals.map((r) => r.candidate_record_id));

    // ─── Batch RTR status check ──────────────────────────────────────
    // For each candidate's email, check if there's an RTR document from
    // this org. Build a map: email → { status, document_id, signed_at }
    const allCandidateEmails = candidates.flatMap((c) =>
      c.contact_info
        .filter((ci) => ci.type === "email" && !ci.deleted_at)
        .map((ci) => ci.value)
    );

    let rtrStatusMap = new Map<string, { status: string; document_id: number; signed_at: Date | null }>();
    if (allCandidateEmails.length > 0 && organizationId) {
      const rtrDocs = await db.vaultSignDocument.findMany({
        where: {
          organization_id: organizationId,
          document_type: "right_to_represent",
          status: { in: ["sent", "partially_signed", "completed"] },
          signers: {
            some: {
              email: { in: allCandidateEmails },
              role: "Candidate",
            },
          },
        },
        include: {
          signers: {
            where: {
              email: { in: allCandidateEmails },
              role: "Candidate",
            },
            select: { email: true, status: true, signed_at: true },
          },
        },
        orderBy: { created_at: "desc" },
      });

      for (const doc of rtrDocs) {
        for (const signer of doc.signers) {
          // Only set if not already set (most recent first due to orderBy)
          if (!rtrStatusMap.has(signer.email)) {
            const isSigned = signer.status === "signed" || doc.status === "completed";
            rtrStatusMap.set(signer.email, {
              status: isSigned ? "signed" : signer.status,
              document_id: doc.id,
              signed_at: signer.signed_at,
            });
          }
        }
      }
    }

    return NextResponse.json({
      candidates: candidates.map((c) => {
        const ownershipWindow = c.ownership_windows[0];
        const isOwner = ownershipWindow?.recruiter_user_id === userId;
        const ownershipPhase = ownershipWindow?.current_phase ?? "open";
        const hasRevealed = revealedSet.has(c.id);
        const isPlatformPool = c.source === "platform_pool";
        const isSelfSignup = c.source === "self_signup";

        // Contact info visibility:
        // - Platform pool: always visible (but show as "View contact" — credits required to actually USE)
        // - Self-signup: visible if claimed (candidate consented by signing up)
        // - Recruiter-submitted + exclusive + NOT owner: HIDDEN
        // - Recruiter-submitted + residual OR owner: visible
        const contactInfoHidden =
          c.source === "recruiter_submitted" &&
          !isOwner &&
          ownershipPhase === "exclusive";

        const primaryEmail = c.contact_info.find((ci) => ci.type === "email" && ci.is_primary);
        const primaryPhone = c.contact_info.find((ci) => ci.type === "phone" && ci.is_primary);

        return {
          id: c.id,
          public_id: c.public_id,
          fullName: [c.first_name, c.last_name].filter(Boolean).join(" ") || "—",
          firstName: c.first_name,
          lastName: c.last_name,
          city: c.city,
          state: c.state,
          jobTitle: c.job_title,
          specialty: c.specialty,
          profession: c.profession,
          source: c.source,
          ownership_phase: ownershipPhase,
          is_owner: isOwner,
          has_revealed: hasRevealed,
          // Show contact info if revealed OR platform pool OR self-signup OR (owner of exclusive)
          primary_email: (hasRevealed || isPlatformPool || isSelfSignup || (isOwner && ownershipPhase === "exclusive")) && !contactInfoHidden
            ? primaryEmail?.value ?? null
            : null,
          primary_phone: (hasRevealed || isPlatformPool || isSelfSignup || (isOwner && ownershipPhase === "exclusive")) && !contactInfoHidden
            ? primaryPhone?.value ?? null
            : null,
          contact_info_locked: contactInfoHidden,
          submission_count: c._count.submissions,
          has_submitted_to_job: jobIdParam ? alreadySubmittedIds.has(c.id) : null,
          // RTR status from the batch query
          rtr_status: (() => {
            const candidateEmails = c.contact_info.filter((ci) => ci.type === "email" && !ci.deleted_at).map((ci) => ci.value);
            for (const email of candidateEmails) {
              const rtr = rtrStatusMap.get(email);
              if (rtr) return rtr.status;
            }
            return "none";
          })(),
          rtr_document_id: (() => {
            const candidateEmails = c.contact_info.filter((ci) => ci.type === "email" && !ci.deleted_at).map((ci) => ci.value);
            for (const email of candidateEmails) {
              const rtr = rtrStatusMap.get(email);
              if (rtr) return rtr.document_id;
            }
            return null;
          })(),
          created_at: c.created_at,
        };
      }),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      job_id: jobIdParam || null,
    });
  } catch (error) {
    console.error("[RECRUITER_CANDIDATE_SEARCH]", error);
    return NextResponse.json({ error: "Failed to search candidates" }, { status: 500 });
  }
}
