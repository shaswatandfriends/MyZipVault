import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALL_STATUSES, STATUS_META, type CandidateStatus } from "@/lib/bob/types";

/**
 * GET /api/recruiter/bob/report
 *
 * Pipeline report for client_admins — aggregates BOB data across all
 * recruiters in the organization.
 *
 * Returns:
 *   - by_status: count of leads in each of the 12 statuses
 *   - by_recruiter: per-recruiter breakdown (lead count, by status, by tag)
 *   - by_tag: hot/warm/cold/inactive counts
 *   - totals: total active, total in pool, total in org
 *
 * Access: client_admin only (sees all recruiters' BOB in their org)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_admin", "super_admin"].includes(role)) {
      return NextResponse.json(
        { error: "Forbidden — admin access required" },
        { status: 403 },
      );
    }

    const where: any = role === "super_admin" ? {} : { organization_id: orgId };

    // ─── By status ────────────────────────────────────────────────
    const byStatusRaw = await db.recruiterLead.groupBy({
      by: ["pipeline_stage"],
      where,
      _count: { id: true },
    });

    const byStatus: Record<string, number> = {};
    for (const s of ALL_STATUSES) {
      byStatus[s] = 0;
    }
    for (const row of byStatusRaw) {
      byStatus[row.pipeline_stage] = row._count?.id ?? 0;
    }

    // ─── By tag ───────────────────────────────────────────────────
    const byTagRaw = await db.recruiterLead.groupBy({
      by: ["tag"],
      where,
      _count: { id: true },
    });

    const byTag: Record<string, number> = { hot: 0, warm: 0, cold: 0, inactive: 0 };
    for (const row of byTagRaw) {
      byTag[row.tag] = row._count?.id ?? 0;
    }

    // ─── By recruiter ─────────────────────────────────────────────
    const recruiters = await db.user.findMany({
      where: role === "super_admin"
        ? { role: { in: ["client_admin", "client_recruiter"] } }
        : { organization_id: orgId, role: { in: ["client_admin", "client_recruiter"] } },
      select: { id: true, first_name: true, last_name: true, email: true },
    });

    const byRecruiter = await Promise.all(
      recruiters.map(async (recruiter) => {
        const leads = await db.recruiterLead.findMany({
          where: { recruiter_user_id: recruiter.id, ...where },
          select: { pipeline_stage: true, tag: true },
        });

        const statusCounts: Record<string, number> = {};
        const tagCounts: Record<string, number> = { hot: 0, warm: 0, cold: 0, inactive: 0 };
        let active = 0;
        let inPool = 0;

        for (const lead of leads) {
          statusCounts[lead.pipeline_stage] = (statusCounts[lead.pipeline_stage] || 0) + 1;
          tagCounts[lead.tag] = (tagCounts[lead.tag] || 0) + 1;
          if (["inactive", "not_interested", "blacklisted"].includes(lead.pipeline_stage)) {
            inPool++;
          } else {
            active++;
          }
        }

        return {
          recruiter: {
            id: recruiter.id,
            name: `${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""}`.trim() || recruiter.email,
            email: recruiter.email,
          },
          total: leads.length,
          active,
          inPool,
          byStatus: statusCounts,
          byTag: tagCounts,
        };
      }),
    );

    // Sort recruiters by total leads (descending)
    byRecruiter.sort((a, b) => b.total - a.total);

    // ─── Totals ───────────────────────────────────────────────────
    const totalActive = Object.entries(byStatus)
      .filter(([status]) => !["inactive", "not_interested", "blacklisted"].includes(status))
      .reduce((sum, [, count]) => sum + count, 0);

    const totalInPool = (byStatus.inactive || 0) + (byStatus.not_interested || 0) + (byStatus.blacklisted || 0);

    return NextResponse.json({
      byStatus,
      byTag,
      byRecruiter,
      totals: {
        active: totalActive,
        inPool: totalInPool,
        total: totalActive + totalInPool,
        recruiters: recruiters.length,
      },
      statusMeta: ALL_STATUSES.map((s) => ({
        value: s,
        label: STATUS_META[s].label,
        icon: STATUS_META[s].icon,
        color: STATUS_META[s].color,
        bgColor: STATUS_META[s].bgColor,
        isActive: STATUS_META[s].isActive,
      })),
    });
  } catch (error: any) {
    console.error("[BOB REPORT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 },
    );
  }
}
