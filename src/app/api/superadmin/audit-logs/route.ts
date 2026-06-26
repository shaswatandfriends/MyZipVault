import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/audit-logs
 *
 * Returns paginated audit log entries with stats.
 *
 * Query params (all optional):
 *   - action=login,logout         (comma-separated list of action names)
 *   - entity_type=user,organization (comma-separated list of entity types)
 *   - role=super_admin,candidate   (comma-separated list of roles)
 *   - search=keyword              (free-text search on action + entity_type)
 *   - date_from=ISO               (created_at >= date_from)
 *   - date_to=ISO                 (created_at <= date_to)
 *   - page=1                      (1-indexed page number)
 *
 * Returns:
 *   {
 *     logs: AuditLogEntry[],
 *     total: number,
 *     page: number,
 *     pageSize: number,
 *     totalPages: number,
 *     stats: { today, thisWeek, uniqueUsersToday, mostActiveUser }
 *   }
 *
 * BUGFIX (2026-06-27): Previous version had a hardcoded `OR` filter that
 * limited results to only 13 skill/checklist-related actions. Every other
 * audit event (logins, password changes, BAA signings, document views,
 * proxy logins, credit purchases, account suspensions, etc.) was filtered
 * out before reaching the page. Removed the hardcoded filter so ALL audit
 * events are visible, with the page's filter controls applying on top.
 *
 * Also fixed:
 *   - Param names now match what the page sends (snake_case: entity_type,
 *     date_from, date_to). Previous code read camelCase variants that the
 *     page never sent, so entity + date filters were silently ignored.
 *   - action / entity_type / role params now parsed as comma-separated
 *     lists (page sends `action=login,logout`). Previous code treated
 *     `action` as a single string, so multi-select never matched.
 *   - role filter is now honored (was previously ignored entirely).
 *   - search no longer overwrites other filters — it's combined with AND.
 *   - stats field is now returned (page was showing 0/empty for all
 *     stat cards because the field was missing from the response).
 */
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

    // ── Parse comma-separated filter params ──
    const actionParam = searchParams.get("action") || "";
    const entityTypeParam = searchParams.get("entity_type") || "";
    const roleParam = searchParams.get("role") || "";
    const search = (searchParams.get("search") || "").trim();
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 50;

    const actions = actionParam
      ? actionParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const entityTypes = entityTypeParam
      ? entityTypeParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const roles = roleParam
      ? roleParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // ── Build Prisma `where` clause ──
    // Top-level AND of: action list, entity_type list, role list,
    // date range, and (optionally) a search OR.
    const where: Record<string, unknown> = {};

    if (actions.length === 1) {
      where.action = actions[0];
    } else if (actions.length > 1) {
      where.action = { in: actions };
    }

    if (entityTypes.length === 1) {
      where.entity_type = entityTypes[0];
    } else if (entityTypes.length > 1) {
      where.entity_type = { in: entityTypes };
    }

    if (roles.length === 1) {
      where.role = roles[0];
    } else if (roles.length > 1) {
      where.role = { in: roles };
    }

    if (dateFrom || dateTo) {
      where.created_at = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      // Combine search with existing filters via AND.
      // The search itself is an OR across action + entity_type fields.
      where.AND = [
        {
          OR: [
            { action: { contains: search, mode: "insensitive" } },
            { entity_type: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    // ── Fetch logs + total count in parallel ──
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

    // ── Compute stats (always based on ALL audit logs, ignoring filters) ──
    // This matches what the page expects: aggregate activity indicators,
    // not filtered subsets.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [todayCount, thisWeekCount, todayUsers] = await Promise.all([
      db.auditLog.count({ where: { created_at: { gte: startOfToday } } }),
      db.auditLog.count({ where: { created_at: { gte: startOfWeek } } }),
      db.auditLog.findMany({
        where: { created_at: { gte: startOfToday }, user_id: { not: null } },
        select: { user_id: true, user: { select: { email: true } } },
      }),
    ]);

    // Most active user today (by count)
    const userCounts = new Map<number, { email: string; count: number }>();
    for (const log of todayUsers) {
      if (!log.user_id || !log.user) continue;
      const existing = userCounts.get(log.user_id);
      if (existing) {
        existing.count += 1;
      } else {
        userCounts.set(log.user_id, { email: log.user.email, count: 1 });
      }
    }
    let mostActiveUser: { email: string; count: number } | null = null;
    for (const { email, count } of userCounts.values()) {
      if (!mostActiveUser || count > mostActiveUser.count) {
        mostActiveUser = { email, count };
      }
    }

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
      stats: {
        today: todayCount,
        thisWeek: thisWeekCount,
        uniqueUsersToday: userCounts.size,
        mostActiveUser,
      },
    });
  } catch (error) {
    console.error("Audit Logs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/audit-logs
 *
 * Exports filtered audit logs as a CSV download.
 *
 * Body params (all optional, same semantics as GET query params):
 *   - action_filter=login,logout   (NOTE: page sends `action_filter` not `action`
 *                                   for POST to avoid clashing with the
 *                                   `action: "export"` discriminator)
 *   - entity_type=user,organization
 *   - role=super_admin,candidate
 *   - search=keyword
 *   - date_from=ISO
 *   - date_to=ISO
 */
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

    const body = await request.json().catch(() => ({}));
    const actionParam = (body.action_filter as string) || "";
    const entityTypeParam = (body.entity_type as string) || "";
    const roleParam = (body.role as string) || "";
    const search = ((body.search as string) || "").trim();
    const dateFrom = (body.date_from as string) || "";
    const dateTo = (body.date_to as string) || "";

    const actions = actionParam
      ? actionParam.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const entityTypes = entityTypeParam
      ? entityTypeParam.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const roles = roleParam
      ? roleParam.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const where: Record<string, unknown> = {};

    if (actions.length === 1) {
      where.action = actions[0];
    } else if (actions.length > 1) {
      where.action = { in: actions };
    }

    if (entityTypes.length === 1) {
      where.entity_type = entityTypes[0];
    } else if (entityTypes.length > 1) {
      where.entity_type = { in: entityTypes };
    }

    if (roles.length === 1) {
      where.role = roles[0];
    } else if (roles.length > 1) {
      where.role = { in: roles };
    }

    if (dateFrom || dateTo) {
      where.created_at = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { action: { contains: search, mode: "insensitive" } },
            { entity_type: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Fetch up to 10,000 rows for export (cap to prevent OOM)
    const logs = await db.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 10000,
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
      },
    });

    // ── Build CSV ──
    const csvRows: string[] = [];
    const headers = [
      "ID",
      "Timestamp",
      "User ID",
      "User Email",
      "User Name",
      "Role",
      "Action",
      "Entity Type",
      "Entity ID",
      "IP Address",
    ];
    csvRows.push(headers.map(escapeCsv).join(","));

    for (const log of logs) {
      const userName = [log.user?.first_name, log.user?.last_name]
        .filter(Boolean)
        .join(" ");
      const row = [
        String(log.id),
        log.created_at.toISOString(),
        log.user_id ?? "",
        log.user?.email ?? "",
        userName,
        log.role ?? "",
        log.action,
        log.entity_type ?? "",
        log.entity_id ?? "",
        log.ip_address ?? "",
      ];
      csvRows.push(row.map(escapeCsv).join(","));
    }

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Audit Logs POST (export) error:", error);
    return NextResponse.json({ error: "Failed to export audit logs" }, { status: 500 });
  }
}

function escapeCsv(value: string | number): string {
  const s = String(value);
  // RFC 4180: wrap in quotes if value contains comma, quote, newline, or CR.
  // Double any embedded quotes.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
