import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/candidate-search?q=<query>
 *
 * Search candidates the recruiter has personally engaged with.
 *
 * SECURITY (Gap 7 fix):
 *   - Recruiters can ONLY search candidates they personally engaged with
 *     (via consent_share or checklist_request where client_user_id = their own user ID)
 *   - Client Admin can search candidates from any recruiter in their org
 *     (they have full visibility per Gap 1 option B)
 *   - Recruiters CANNOT see candidates from other recruiters at their company
 *     (eliminates the org-wide candidate discovery that violated Rule 3)
 *
 * Returns:
 *   - Limited fields only (id, name, email, phone, profile_completion_pct)
 *   - Document access still requires consent_share + unlock flow
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number(session.user.id);
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    // Verify recruiter/admin role
    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // ─── Build the list of candidate IDs this recruiter can search ───
    //
    // Per Gap 1 decision (all three layers apply):
    //   - Individual recruiter: sees ONLY their own candidates
    //     (consent_share.client_user_id = userId OR checklist_request.client_user_id = userId)
    //   - Client Admin: sees ALL recruiters' candidates in their org
    //     (any user with organization_id = their org who has consent_share or checklist_request)

    let searchableClientUserIds: number[] = [userId];

    if (userRole === "client_admin" && organizationId) {
      // Client Admin can search across all recruiters in their org
      const orgUsers = await db.user.findMany({
        where: {
          organization_id: organizationId,
          role: { in: ["client_admin", "client_recruiter"] },
        },
        select: { id: true },
      });
      searchableClientUserIds = orgUsers.map((u) => u.id);
    }

    // Find candidates this recruiter/admin can see
    const [consentShareCandidates, checklistRequestCandidates] =
      await Promise.all([
        db.consentShare.findMany({
          where: {
            client_user_id: { in: searchableClientUserIds },
            is_deleted: false,
            candidate_user: { role: "candidate" },
          },
          select: { candidate_user_id: true },
          distinct: ["candidate_user_id"],
        }),
        db.checklistRequest.findMany({
          where: {
            client_user_id: { in: searchableClientUserIds },
          },
          select: { candidate_user_id: true },
          distinct: ["candidate_user_id"],
        }),
      ]);

    const candidateIds = new Set([
      ...consentShareCandidates.map((c) => c.candidate_user_id),
      ...checklistRequestCandidates.map((c) => c.candidate_user_id),
    ]);

    if (candidateIds.size === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Search by email or name within authorized candidates
    const candidates = await db.user.findMany({
      where: {
        id: { in: Array.from(candidateIds) },
        role: "candidate",
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { first_name: { contains: q, mode: "insensitive" } },
          { last_name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        candidate_profile: {
          select: { profile_completion_pct: true },
        },
      },
      take: 20, // Limit results
    });

    const results = candidates.map((c) => ({
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      profile_completion_pct: c.candidate_profile?.profile_completion_pct ?? 0,
    }));

    return NextResponse.json({ candidates: results });
  } catch (error) {
    console.error("[RECRUITER_CANDIDATE_SEARCH]", error);
    return NextResponse.json(
      { error: "Failed to search candidates" },
      { status: 500 }
    );
  }
}
