import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const SKILLS_ACTIONS = [
  "checklist_sent",
  "checklist_opened",
  "checklist_completed",
  "skill_created",
  "skill_updated",
  "skill_deleted",
  "template_created",
  "template_updated",
  "template_deleted",
  "skills_imported",
  "skills_deleted_all",
  "checklist_expiry_extended",
  "checklist_response_deleted",
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "";
    const entityType = searchParams.get("entityType") || "";
    const userId = searchParams.get("userId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 50;

    const where: Record<string, unknown> = {
      OR: [
        { action: { in: SKILLS_ACTIONS } },
        { entity_type: { in: ["checklist_template", "skill", "candidate_checklist_response", "checklist_request"] } },
      ],
    };

    if (action) {
      where.action = action;
    }
    if (entityType) {
      where.entity_type = entityType;
    }
    if (userId) {
      where.user_id = parseInt(userId);
    }
    if (dateFrom || dateTo) {
      where.created_at = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      };
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity_type: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, first_name: true, last_name: true, email: true, role: true },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        ipAddress: log.ip_address,
        role: log.role,
        createdAt: log.created_at,
        user: log.user
          ? {
              id: log.user.id,
              firstName: log.user.first_name,
              lastName: log.user.last_name,
              email: log.user.email,
              role: log.user.role,
            }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Audit Logs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
