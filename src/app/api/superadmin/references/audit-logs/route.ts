import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/superadmin/references/audit-logs — Reference-related audit logs
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const actionsParam = searchParams.get("actions") || "";
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const REFERENCE_ACTIONS = [
      "reference_sent",
      "reference_completed",
      "reference_deleted",
      "reference_question_created",
      "reference_question_updated",
      "reference_question_deleted",
      "reference_deletion_approved",
      "reference_deletion_rejected",
    ];

    const where: Record<string, unknown> = {};

    // Filter by reference-related actions
    if (actionsParam && actionsParam !== "all") {
      const requestedActions = actionsParam.split(",").filter((a) =>
        REFERENCE_ACTIONS.includes(a)
      );
      if (requestedActions.length > 0) {
        where.action = { in: requestedActions };
      } else {
        where.action = { in: REFERENCE_ACTIONS };
      }
    } else {
      where.action = { in: REFERENCE_ACTIONS };
    }

    // Search by user email
    if (search) {
      where.user = {
        email: { contains: search, mode: "insensitive" },
      };
    }

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });

    const total = await db.auditLog.count({ where });

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        user_id: log.user_id,
        role: log.role,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        ip_address: log.ip_address,
        created_at: log.created_at,
        user: log.user,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Superadmin references audit logs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
