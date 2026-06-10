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
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || undefined;
    const search = searchParams.get("search") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    // Filter for reference-related entity types only
    const entityTypes = ["CandidateReference", "ReferenceQuestion", "ReferenceResponse"];

    const where: Record<string, unknown> = {
      entity_type: { in: entityTypes },
    };

    if (action) {
      where.action = action;
    }

    if (from || to) {
      where.created_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { entity_type: { contains: search } },
        { user: { email: { contains: search } } },
        { user: { first_name: { contains: search } } },
        { user: { last_name: { contains: search } } },
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
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              role: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.user_id,
        userEmail: log.user?.email ?? null,
        userName: log.user
          ? `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim()
          : null,
        role: log.role,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_AUDIT_LOGS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch reference audit logs" },
      { status: 500 }
    );
  }
}
