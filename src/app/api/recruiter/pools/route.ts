import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScopedClientUserIds } from "@/lib/recruiter-scope";

/**
 * GET /api/recruiter/pools
 *   Returns all pools for the current recruiter (or all recruiters' pools for client_admin).
 */
export async function GET() {
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

    // Client admins see all recruiters' pools; individual recruiters see only their own
    const scope = await getScopedClientUserIds(userRole, userId, organizationId);
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pools = await db.candidatePool.findMany({
      where: {
        organization_id: organizationId,
        recruiter_user_id: { in: scope.clientUserIds },
      },
      include: {
        recruiter: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ pools });
  } catch (error) {
    console.error("[POOLS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch pools" }, { status: 500 });
  }
}

/**
 * POST /api/recruiter/pools
 *   Creates a new candidate pool.
 *
 * Body: { name: string, description?: string, color?: string }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Pool name is required" }, { status: 400 });
    }

    const validColors = ["#059669", "#0D9488", "#2563EB", "#7C3AED", "#D97706", "#DC2626", "#DB2777", "#0B1F3A"];
    const poolColor = validColors.includes(color) ? color : "#059669";

    const pool = await db.candidatePool.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: poolColor,
        recruiter_user_id: userId,
        organization_id: organizationId,
      },
    });

    return NextResponse.json({ pool }, { status: 201 });
  } catch (error) {
    console.error("[POOLS_CREATE]", error);
    return NextResponse.json({ error: "Failed to create pool" }, { status: 500 });
  }
}
