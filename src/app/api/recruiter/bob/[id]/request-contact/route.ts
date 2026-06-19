import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/recruiter/bob/[id]/request-contact
 *
 * Recruiter requests the candidate's email, phone, or calendar access.
 *
 * Body:
 *   - type: "email" | "phone" | "calendar"
 *
 * Behavior:
 *   - Sets requested_email_at / requested_phone_at / requested_calendar_at
 *     on the lead (tracks when the request was made)
 *   - Creates an in-app notification for the candidate (if they have a
 *     platform account) asking them to provide the missing info
 *   - Logs an activity to the lead's timeline
 *
 * The candidate sees the request in their notification bell and can
 * respond by updating their profile (email/phone) or sharing their
 * calendar.
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
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    if (!["client_recruiter", "client_admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type } = body;

    if (!["email", "phone", "calendar"].includes(type)) {
      return NextResponse.json(
        { error: `Invalid type: ${type}. Must be 'email', 'phone', or 'calendar'` },
        { status: 400 },
      );
    }

    const lead = await db.recruiterLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        recruiter_user_id: true,
        organization_id: true,
        candidate_user_id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        requested_email_at: true,
        requested_phone_at: true,
        requested_calendar_at: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Visibility check
    if (role !== "super_admin") {
      const isOwner = lead.recruiter_user_id === userId;
      const isAdmin = role === "client_admin";
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Update the requested_*_at timestamp
    const now = new Date();
    const updateField = type === "email" ? "requested_email_at"
      : type === "phone" ? "requested_phone_at"
      : "requested_calendar_at";

    await db.recruiterLead.update({
      where: { id: leadId },
      data: { [updateField]: now },
    });

    // Log activity to timeline
    try {
      const { logActivity } = await import("@/lib/bob/status-engine");
      const requestLabel = type === "email" ? "email address"
        : type === "phone" ? "phone number"
        : "calendar access";

      await logActivity({
        leadId,
        activityType: "next_action_set",
        description: `Requested ${requestLabel} from candidate`,
        actorUserId: userId,
        actorType: "recruiter",
        metadata: { request_type: type },
      });
    } catch (err) {
      console.error("[BOB] Failed to log contact request activity:", err);
    }

    // Notify the candidate (if they have a platform account)
    if (lead.candidate_user_id) {
      try {
        const recruiter = await db.user.findUnique({
          where: { id: userId },
          select: { first_name: true, last_name: true, organization: { select: { name: true } } },
        });
        const orgName = recruiter?.organization?.name || "a recruiter";
        const recruiterName = `${recruiter?.first_name ?? ""} ${recruiter?.last_name ?? ""}`.trim() || "Recruiter";

        const notifTitle = type === "email"
          ? `${orgName} is requesting your email address`
          : type === "phone"
          ? `${orgName} is requesting your phone number`
          : `${orgName} is requesting access to your calendar`;

        const notifMessage = type === "email"
          ? `${recruiterName} from ${orgName} would like your email address. Please update your profile to include it.`
          : type === "phone"
          ? `${recruiterName} from ${orgName} would like your phone number. Please update your profile to include it.`
          : `${recruiterName} from ${orgName} would like to see your calendar availability. Please share your calendar from your settings.`;

        await db.notification.create({
          data: {
            user_id: lead.candidate_user_id,
            title: notifTitle,
            message: notifMessage,
            type: "lead_stage_change",
            related_entity_id: leadId,
            related_entity_type: "lead",
          },
        });
      } catch (err) {
        console.error("[BOB] Failed to send candidate notification:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Requested ${type} from candidate${lead.candidate_user_id ? " — they'll see it in their notifications" : " (no platform account yet — request logged)"}`,
    });
  } catch (error: any) {
    console.error("[BOB REQUEST_CONTACT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send request" },
      { status: 500 },
    );
  }
}
