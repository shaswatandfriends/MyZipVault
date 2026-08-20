import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/recruiter/[publicId]/report
 *
 * File a formal report against a recruiter. Auth required.
 * Goes to superadmin review queue (private).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized — you must be logged in to file a report" }, { status: 401 });
    }

    const reporterId = parseInt(session.user.id as string, 10);
    const reporterRole = (session.user as Record<string, unknown>).role as string;
    const { publicId } = await params;

    const recruiter = await db.user.findFirst({
      where: { public_id: publicId, role: { in: ["client_recruiter", "client_admin"] } },
      select: { id: true, first_name: true, last_name: true, email: true },
    });
    if (!recruiter) return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });

    const body = await request.json();
    const { reason_category, description, is_anonymous } = body;

    const validReasons = ["misrepresentation", "harassment", "fee_dispute", "rtr_violation", "data_misuse", "other"];
    if (!reason_category || !validReasons.includes(reason_category)) {
      return NextResponse.json({ error: "Invalid reason category" }, { status: 400 });
    }
    if (!description || typeof description !== "string" || description.trim().length < 50) {
      return NextResponse.json({ error: "Description must be at least 50 characters" }, { status: 400 });
    }

    // Determine priority based on reason
    let priority = "normal";
    if (reason_category === "rtr_violation" || reason_category === "harassment") {
      priority = "high";
    }

    const report = await db.recruiterReport.create({
      data: {
        recruiter_user_id: recruiter.id,
        reporter_user_id: is_anonymous ? null : reporterId,
        reporter_role: reporterRole,
        reason_category,
        description: description.trim().substring(0, 2000),
        status: "pending",
        priority,
      },
      select: { id: true },
    });

    try {
      await logAudit({
        userId: reporterId, role: reporterRole,
        action: "report_filed",
        entityType: "recruiter_report", entityId: report.id,
        details: `Filed report against ${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""} (${recruiter.email}) — Reason: ${reason_category}${is_anonymous ? " [anonymous]" : ""}`,
      });
    } catch (auditErr) { console.error("[AUDIT_LOG]", auditErr); }

    return NextResponse.json({
      success: true, report_id: report.id,
      message: "Report filed. Our team will review this and take appropriate action. You'll be notified of the outcome.",
    }, { status: 201 });
  } catch (error) {
    console.error("[REPORT_SUBMIT]", error);
    return NextResponse.json({ error: "Failed to file report" }, { status: 500 });
  }
}
