import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reactivateLead } from "@/lib/bob/status-engine";

/**
 * POST /api/recruiter/bob/[id]/reactivate
 *
 * Reactivate a blacklisted or not_interested lead.
 *
 * This is called AFTER the recruiter confirms the prompt:
 *   "This candidate was marked Not Interested on [date]. Reactivate?"
 *
 * Behavior:
 *   - Sets status → "interested"
 *   - Clears blacklist fields (reason, blacklisted_at, blacklisted_by_user_id)
 *   - Claims the lead for the current recruiter (if it was in company pool)
 *   - Preserves full activity history
 *   - Logs a "reactivated" activity
 *
 * Visibility:
 *   - Any recruiter in the same org can reactivate a company pool lead
 *   - Owner can reactivate their own lead
 *   - Admin can reactivate any lead in their org
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const userId = Number((session.user as Record<string, unknown>).id);
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        recruiter_user_id: true,
        organization_id: true,
        pipeline_stage: true,
        blacklist_reason: true,
        blacklisted_at: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // ─── Visibility check ────────────────────────────────────────
    if (role !== "super_admin") {
      const isOwner = lead.recruiter_user_id === userId;
      const isInOrg = lead.organization_id === orgId;
      const isCompanyPool = ["inactive", "not_interested", "blacklisted"].includes(lead.pipeline_stage);
      const isAdmin = role === "client_admin";

      if (!isInOrg || (!isOwner && !isCompanyPool && !isAdmin)) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // ─── Only allow reactivation from company pool statuses ──────
    if (!["inactive", "not_interested", "blacklisted"].includes(lead.pipeline_stage)) {
      return NextResponse.json({
        error: `Cannot reactivate a lead with status '${lead.pipeline_stage}' — only blacklisted/not_interested/inactive leads can be reactivated`,
      }, { status: 400 });
    }

    // ─── Claim the lead for the current recruiter (if it was in company pool) ───
    // This transfers ownership from the original recruiter to the one reactivating
    if (lead.recruiter_user_id !== userId) {
      await db.recruiterLead.update({
        where: { id: leadId },
        data: { recruiter_user_id: userId },
      });
    }

    // ─── Reactivate via status engine ───────────────────────────
    await reactivateLead({
      leadId,
      actorUserId: userId,
    });

    const updated = await db.recruiterLead.findUnique({
      where: { id: leadId },
      include: {
        recruiter_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      lead: updated,
      message: "Lead reactivated — moved to your BOB with status 'Interested'. Full history preserved.",
    });
  } catch (error: any) {
    console.error("[BOB REACTIVATE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reactivate lead" },
      { status: 500 },
    );
  }
}
