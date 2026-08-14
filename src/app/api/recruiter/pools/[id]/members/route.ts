import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScopedClientUserIds } from "@/lib/recruiter-scope";

/**
 * POST /api/recruiter/pools/[id]/members
 *   Adds a candidate to a pool.
 *
 * Body: { candidateUserId: number, notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number(session.user.id);
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const poolId = parseInt(id);
    if (isNaN(poolId)) {
      return NextResponse.json({ error: "Invalid pool ID" }, { status: 400 });
    }

    // Verify pool ownership
    const scope = await getScopedClientUserIds(userRole, userId, organizationId);
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pool = await db.candidatePool.findFirst({
      where: {
        id: poolId,
        organization_id: organizationId,
        recruiter_user_id: { in: scope.clientUserIds },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    const body = await request.json();
    const { candidateUserId, notes } = body;

    if (!candidateUserId || isNaN(Number(candidateUserId))) {
      return NextResponse.json({ error: "Valid candidateUserId is required" }, { status: 400 });
    }

    // Verify the recruiter has access to this candidate (Gap 1 scoping)
    //
    // SECURITY FIX: The previous implementation used `Array.some(async ...)`
    // which ALWAYS returns true because async callbacks return Promises
    // (truthy). This was an access-control bypass — any recruiter could
    // add ANY candidate to their pool, even candidates they had never
    // engaged with.
    //
    // The fix uses a single bulk query with `client_user_id: { in: scope.clientUserIds }`
    // which is both correct AND more efficient (1 query instead of N).
    const [consentShare, checklistRequest] = await Promise.all([
      db.consentShare.findFirst({
        where: {
          client_user_id: { in: scope.clientUserIds },
          candidate_user_id: Number(candidateUserId),
          is_deleted: false,
        },
        select: { id: true },
      }),
      db.checklistRequest.findFirst({
        where: {
          client_user_id: { in: scope.clientUserIds },
          candidate_user_id: Number(candidateUserId),
        },
        select: { id: true },
      }),
    ]);

    const hasAccess = !!(consentShare || checklistRequest);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You can only add candidates you've engaged with to pools." },
        { status: 403 }
      );
    }

    // Add to pool (upsert to handle duplicates gracefully)
    const member = await db.candidatePoolMember.upsert({
      where: {
        pool_id_candidate_user_id: {
          pool_id: poolId,
          candidate_user_id: Number(candidateUserId),
        },
      },
      update: {
        notes: notes?.trim() || null,
      },
      create: {
        pool_id: poolId,
        candidate_user_id: Number(candidateUserId),
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("[POOL_MEMBER_ADD]", error);
    return NextResponse.json({ error: "Failed to add candidate to pool" }, { status: 500 });
  }
}

/**
 * DELETE /api/recruiter/pools/[id]/members?candidateUserId=123
 *   Removes a candidate from a pool.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number(session.user.id);
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const poolId = parseInt(id);
    if (isNaN(poolId)) {
      return NextResponse.json({ error: "Invalid pool ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const candidateUserId = parseInt(searchParams.get("candidateUserId") || "0");
    if (!candidateUserId) {
      return NextResponse.json({ error: "candidateUserId query param is required" }, { status: 400 });
    }

    // Verify pool ownership
    const pool = await db.candidatePool.findFirst({
      where: {
        id: poolId,
        organization_id: organizationId,
        recruiter_user_id: userId,
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    await db.candidatePoolMember.deleteMany({
      where: {
        pool_id: poolId,
        candidate_user_id: candidateUserId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POOL_MEMBER_REMOVE]", error);
    return NextResponse.json({ error: "Failed to remove candidate from pool" }, { status: 500 });
  }
}
