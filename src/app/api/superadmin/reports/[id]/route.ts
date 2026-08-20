import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * PUT /api/superadmin/reports/[id] — resolve a report
 *
 * Body:
 *   - status: 'resolved' | 'dismissed'
 *   - resolution_action: 'no_action' | 'warning' | 'temp_suspension' | 'perm_ban' | 'rtr_revoked'
 *   - resolution_notes: string
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin" && role !== "platform_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminId = parseInt(session.user.id as string, 10);
    const { id } = await params;
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { status, resolution_action, resolution_notes } = body;

    const validActions = ["no_action", "warning", "temp_suspension", "perm_ban", "rtr_revoked"];
    if (!validActions.includes(resolution_action)) {
      return NextResponse.json({ error: "Invalid resolution action" }, { status: 400 });
    }

    const report = await db.recruiterReport.findUnique({
      where: { id: reportId },
      select: { id: true, recruiter_user_id: true, reason_category: true },
    });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const now = new Date();
    const updated = await db.recruiterReport.update({
      where: { id: reportId },
      data: {
        status: status || "resolved",
        resolution_action,
        resolution_notes: resolution_notes || null,
        resolved_at: now,
        admin_user_id: adminId,
      },
    });

    // If suspension action, suspend the user
    if (resolution_action === "temp_suspension" || resolution_action === "perm_ban") {
      await db.user.update({
        where: { id: report.recruiter_user_id },
        data: { account_status: resolution_action === "perm_ban" ? "banned" : "suspended" },
      });
    }

    try {
      await logAudit({
        userId: adminId, role,
        action: "report_resolved",
        entityType: "recruiter_report", entityId: reportId,
        details: `Report #${reportId} resolved — Action: ${resolution_action}. Recruiter: ${report.recruiter_user_id}.`,
      });
    } catch (e) { console.error("[AUDIT]", e); }

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("[REPORT_RESOLVE]", error);
    return NextResponse.json({ error: "Failed to resolve report" }, { status: 500 });
  }
}
