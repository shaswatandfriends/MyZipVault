import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/skill-checklist/overview
 * Returns aggregated stats for the Skill Checklist section.
 * Query params: from, to (ISO date strings for filtering)
 */
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
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // Build date filter for ChecklistRequest.created_at
    const dateFilter: Record<string, Date> = {};
    if (fromParam) {
      dateFilter.gte = new Date(fromParam);
    }
    if (toParam) {
      dateFilter.lte = new Date(toParam);
    }

    const createdWhere =
      Object.keys(dateFilter).length > 0
        ? { created_at: dateFilter }
        : {};

    // ── Global Stats ──────────────────────────────────────────────────
    const [
      totalLinks,
      pendingCount,
      completedCount,
      companiesWithRequests,
      emailsSentCount,
    ] = await Promise.all([
      // Total checklist requests (links generated)
      db.checklistRequest.count({ where: createdWhere }),

      // Pending = sent or opened
      db.checklistRequest.count({
        where: { ...createdWhere, status: { in: ["sent", "opened"] } },
      }),

      // Completed
      db.checklistRequest.count({
        where: { ...createdWhere, status: "completed" },
      }),

      // Distinct companies with checklist requests
      db.checklistRequest.findMany({
        where: createdWhere,
        select: { client_user: { select: { organization_id: true } } },
        distinct: ["client_user_id"],
      }),

      // Emails sent — count of checklist requests that were sent
      // (each request = one email dispatched)
      db.checklistRequest.count({
        where: { ...createdWhere, status: { in: ["sent", "opened", "in_progress", "completed"] } },
      }),
    ]);

    // Extract distinct organization IDs
    const orgIds = new Set<number>();
    for (const r of companiesWithRequests) {
      if (r.client_user?.organization_id) {
        orgIds.add(r.client_user.organization_id);
      }
    }
    const companiesCount = orgIds.size;

    const completionRate =
      totalLinks > 0 ? Math.round((completedCount / totalLinks) * 100) : 0;

    // ── Company Breakdown ──────────────────────────────────────────────
    // Get all organizations that have users who created checklist requests
    const organizations = await db.organization.findMany({
      where: {
        is_active: true,
        users: {
          some: {
            checklist_requests_as_client: {
              some: createdWhere,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        users: {
          where: {
            checklist_requests_as_client: { some: createdWhere },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const companyBreakdown = await Promise.all(
      organizations.map(async (org) => {
        const clientUserIds = org.users.map((u) => u.id);

        const [orgLinks, orgPending, orgCompleted] = await Promise.all([
          db.checklistRequest.count({
            where: {
              client_user_id: { in: clientUserIds },
              ...createdWhere,
            },
          }),
          db.checklistRequest.count({
            where: {
              client_user_id: { in: clientUserIds },
              status: { in: ["sent", "opened"] },
              ...createdWhere,
            },
          }),
          db.checklistRequest.count({
            where: {
              client_user_id: { in: clientUserIds },
              status: "completed",
              ...createdWhere,
            },
          }),
        ]);

        // Credits used by this org for checklist-related spend
        const creditsResult = await db.creditTransaction.aggregate({
          _sum: { credit_amount: true },
          where: {
            organization_id: org.id,
            transaction_type: { in: ["spend", "deduction"] },
            description: { contains: "checklist" },
            ...(fromParam || toParam
              ? { created_at: dateFilter }
              : {}),
          },
        });

        const orgCompletionRate =
          orgLinks > 0 ? Math.round((orgCompleted / orgLinks) * 100) : 0;

        return {
          name: org.name,
          linksGenerated: orgLinks,
          pending: orgPending,
          completed: orgCompleted,
          completionRate: orgCompletionRate,
          creditsUsed: Math.abs(creditsResult._sum.credit_amount ?? 0),
        };
      })
    );

    // ── Recent Activity ────────────────────────────────────────────────
    const recentRequests = await db.checklistRequest.findMany({
      where: createdWhere,
      select: {
        id: true,
        status: true,
        created_at: true,
        candidate_user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        client_user: {
          select: {
            organization: {
              select: { name: true },
            },
          },
        },
        checklist_template: {
          select: { name: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    const recentActivity = recentRequests.map((r) => ({
      id: r.id,
      candidateName:
        [r.candidate_user.first_name, r.candidate_user.last_name]
          .filter(Boolean)
          .join(" ") || "Unknown",
      companyName: r.client_user.organization?.name || "No Company",
      templateName: r.checklist_template.name,
      status: r.status,
      date: r.created_at,
    }));

    return NextResponse.json({
      stats: {
        companies: companiesCount,
        linksGenerated: totalLinks,
        emailsSent: emailsSentCount,
        pending: pendingCount,
        completed: completedCount,
        completionRate,
      },
      companyBreakdown,
      recentActivity,
    });
  } catch (error) {
    console.error("Skill Checklist Overview GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch skill checklist overview" },
      { status: 500 }
    );
  }
}
