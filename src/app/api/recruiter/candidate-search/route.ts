import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number(session.user.id);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    // Verify recruiter/admin role
    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    // Find candidates who have active consent_share with this recruiter's org
    // OR who have a checklist_request from this recruiter
    const consentShareCandidates = await db.consentShare.findMany({
      where: {
        client_user_id: userId,
        is_deleted: false,
        candidate_user: {
          role: "candidate",
        },
      },
      select: { candidate_user_id: true },
      distinct: ["candidate_user_id"],
    });

    const checklistRequestCandidates = await db.checklistRequest.findMany({
      where: {
        client_user_id: userId,
      },
      select: { candidate_user_id: true },
      distinct: ["candidate_user_id"],
    });

    // Also find candidates whose consent shares are from the same organization
    let orgConsentCandidates: { candidate_user_id: number }[] = [];
    if (organizationId) {
      const orgUsers = await db.user.findMany({
        where: { organization_id: organizationId, role: { in: ["client_admin", "client_recruiter"] } },
        select: { id: true },
      });
      const orgUserIds = orgUsers.map((u) => u.id);

      orgConsentCandidates = await db.consentShare.findMany({
        where: {
          client_user_id: { in: orgUserIds },
          is_deleted: false,
          candidate_user: {
            role: "candidate",
          },
        },
        select: { candidate_user_id: true },
        distinct: ["candidate_user_id"],
      });
    }

    const candidateIds = new Set([
      ...consentShareCandidates.map((c) => c.candidate_user_id),
      ...checklistRequestCandidates.map((c) => c.candidate_user_id),
      ...orgConsentCandidates.map((c) => c.candidate_user_id),
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
          { email: { contains: q } },
          { first_name: { contains: q } },
          { last_name: { contains: q } },
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
