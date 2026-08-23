import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get full call history for a lead
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const leadId = Number(id);

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId, is_deleted: false },
      select: { id: true, recruiter_user_id: true, organization_id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check access
    if (userRole === "client_recruiter" && lead.recruiter_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (userRole === "client_admin" && lead.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const callLogs = await db.callLog.findMany({
      where: { lead_id: leadId },
      include: {
        call_schedule: {
          select: {
            id: true,
            schedule_type: true,
            scheduled_date: true,
            status: true,
            remark: true,
          },
        },
        recruiter_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
      orderBy: { call_date: "desc" },
    });

    return NextResponse.json({ callLogs });
  } catch (error) {
    console.error("[CALENDAR_LEAD_HISTORY_GET]", error);
    return NextResponse.json({ error: "Failed to fetch call history" }, { status: 500 });
  }
}
