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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") || "all";
    const service = searchParams.get("service") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 50;

    const where: Record<string, unknown> = {};
    if (severity !== "all") where.severity = severity;
    if (service !== "all") where.service = service;

    const [logs, total] = await Promise.all([
      db.systemErrorLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.systemErrorLog.count({ where }),
    ]);

    // Get stats for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [infoCount, warningCount, criticalCount] = await Promise.all([
      db.systemErrorLog.count({ where: { severity: "info", created_at: { gte: todayStart } } }),
      db.systemErrorLog.count({ where: { severity: "warning", created_at: { gte: todayStart } } }),
      db.systemErrorLog.count({ where: { severity: "critical", created_at: { gte: todayStart } } }),
    ]);

    // Get distinct services
    const serviceRecords = await db.systemErrorLog.findMany({
      distinct: ["service"],
      select: { service: true },
    });
    const services = serviceRecords.map((r) => r.service);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        severity: l.severity,
        service: l.service,
        errorMessage: l.error_message,
        createdAt: l.created_at,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: { infoCount, warningCount, criticalCount },
      services,
    });
  } catch (error) {
    console.error("Superadmin Errors GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch error logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "clear_old_logs": {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const deleted = await db.systemErrorLog.deleteMany({
          where: { created_at: { lt: thirtyDaysAgo } },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "clear_old_error_logs",
            entity_type: "system_error_log",
            entity_id: null,
          },
        });

        return NextResponse.json({
          success: true,
          deletedCount: deleted.count,
          message: `Cleared ${deleted.count} logs older than 30 days`,
        });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Errors POST error:", error);
    return NextResponse.json(
      { error: "Failed to process error log action" },
      { status: 500 }
    );
  }
}
