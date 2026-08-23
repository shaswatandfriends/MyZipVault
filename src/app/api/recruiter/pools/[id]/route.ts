import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScopedClientUserIds } from "@/lib/recruiter-scope";

/**
 * GET /api/recruiter/pools/[id]
 *   Returns a single pool with its members.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
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

    // Verify access (recruiter owns it, or client_admin is in same org)
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
      include: {
        recruiter: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        members: {
          include: {
            candidate: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                last_activity_at: true,
                candidate_profile: {
                  select: { phone: true, profile_completion_pct: true },
                },
              },
            },
          },
          orderBy: { added_at: "desc" },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    return NextResponse.json({ pool });
  } catch (error) {
    console.error("[POOLS_GET_ONE]", error);
    return NextResponse.json({ error: "Failed to fetch pool" }, { status: 500 });
  }
}

/**
 * PUT /api/recruiter/pools/[id]
 *   Updates a pool (name, description, color).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
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

    // Verify ownership
    const existing = await db.candidatePool.findFirst({
      where: {
        id: poolId,
        organization_id: organizationId,
        recruiter_user_id: userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json({ error: "Pool name cannot be empty" }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.color !== undefined) {
      const validColors = ["#059669", "#0D9488", "#2563EB", "#7C3AED", "#D97706", "#DC2626", "#DB2777", "#0B1F3A"];
      if (validColors.includes(body.color)) {
        updateData.color = body.color;
      }
    }

    const updated = await db.candidatePool.update({
      where: { id: poolId },
      data: updateData,
    });

    return NextResponse.json({ pool: updated });
  } catch (error) {
    console.error("[POOLS_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update pool" }, { status: 500 });
  }
}

/**
 * DELETE /api/recruiter/pools/[id]
 *   Deletes a pool and all its members (cascade).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
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

    // Verify ownership
    const existing = await db.candidatePool.findFirst({
      where: {
        id: poolId,
        organization_id: organizationId,
        recruiter_user_id: userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Cascade delete (members auto-deleted via onDelete: Cascade)
    await db.candidatePool.delete({
      where: { id: poolId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POOLS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete pool" }, { status: 500 });
  }
}
