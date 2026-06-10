import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Checklist-related entity types for filtering
const CHECKLIST_ENTITY_TYPES = [
  "Profession",
  "Specialty",
  "SkillCategory",
  "Skill",
  "ChecklistTemplate",
  "ChecklistRequest",
  "CandidateChecklistResponse",
  "SkillRating",
] as const;

const VALID_ACTIONS = ["Create", "Update", "Delete", "Login", "Send", "View"] as const;

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

    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));

    // Build where clause — always filter to checklist-related entity types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      entity_type: { in: CHECKLIST_ENTITY_TYPES as unknown as string[] },
    };

    // Filter by action
    if (action && VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
      where.action = { contains: action, mode: "insensitive" };
    }

    // Filter by entity type
    if (entityType && CHECKLIST_ENTITY_TYPES.includes(entityType as (typeof CHECKLIST_ENTITY_TYPES)[number])) {
      where.entity_type = entityType;
    }

    // Filter by date range
    if (from || to) {
      where.created_at = {};
      if (from) {
        where.created_at.gte = new Date(from);
      }
      if (to) {
        // Include the entire end day
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.created_at.lte = toDate;
      }
    }

    // Search by user email or name
    if (search && search.trim()) {
      where.user = {
        OR: [
          { email: { contains: search.trim(), mode: "insensitive" } },
          { first_name: { contains: search.trim(), mode: "insensitive" } },
          { last_name: { contains: search.trim(), mode: "insensitive" } },
        ],
      };
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.user_id,
        role: log.role,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
        user: log.user
          ? {
              email: log.user.email,
              firstName: log.user.first_name,
              lastName: log.user.last_name,
            }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Skill Checklist Audit Logs GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
