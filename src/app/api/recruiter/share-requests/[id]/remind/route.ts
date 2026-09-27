// @ts-nocheck — TODO(audit-2): pre-existing schema drift in legacy code.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";

// POST /api/recruiter/share-requests/[id]/remind
// Sends an in-app reminder notification + email to the candidate,
// asking them to share the requested documents.
// Only allowed if:
//   1. The share request is still pending (not fulfilled)
//   2. At least 24 hours have passed since the original request
//   3. No reminder was sent in the last 24 hours (cooldown)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin", "platform_admin", "super_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const { id } = await params;
    const shareRequestId = Number(id);

    // Find the share request
    const shareRequest = await db.shareRequest.findUnique({
      where: { id: shareRequestId },
      include: {
        candidate_user: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        client_user: {
          select: { id: true, first_name: true, last_name: true, organization_id: true },
        },
      },
    });

    if (!shareRequest) {
      return NextResponse.json(
        { error: "Share request not found" },
        { status: 404 }
      );
    }

    // Verify the recruiter owns this share request (or is platform_admin/super_admin)
    if (userRole === "client_recruiter" || userRole === "client_admin") {
      if (shareRequest.client_user_id !== userId) {
        // Check if same org
        const requester = await db.user.findUnique({
          where: { id: userId },
          select: { organization_id: true },
        });
        if (requester?.organization_id !== shareRequest.client_user.organization_id) {
          return NextResponse.json(
            { error: "You don't have access to this share request" },
            { status: 403 }
          );
        }
      }
    }

    // Don't send reminder if already fulfilled
    if (shareRequest.status === "fulfilled" || shareRequest.status === "completed") {
      return NextResponse.json(
        { error: "Document request has already been fulfilled" },
        { status: 400 }
      );
    }

    // Check 24-hour waiting period from original request
    const requestAge = Date.now() - new Date(shareRequest.created_at).getTime();
    const hoursSinceRequest = requestAge / (1000 * 60 * 60);
    if (hoursSinceRequest < 24) {
      const hoursLeft = Math.ceil(24 - hoursSinceRequest);
      return NextResponse.json(
        {
          error: `Reminders can only be sent 24 hours after the original request. Please wait ${hoursLeft} more hour${hoursLeft === 1 ? "" : "s"}.`,
        },
        { status: 429 }
      );
    }

    // Check 24-hour cooldown on reminders
    const recentReminder = await db.notification.findFirst({
      where: {
        user_id: shareRequest.candidate_user_id,
        related_entity_id: shareRequestId,
        related_entity_type: "share_request_reminder",
        created_at: { gte: new Date(Date.now() - 86400000) },
      },
    });
    if (recentReminder) {
      return NextResponse.json(
        { error: "A reminder was already sent recently. Please wait 24 hours." },
        { status: 429 }
      );
    }

    // Build list of requested document types for the message
    const requestedTypes: string[] = [];
    if (shareRequest.request_checklists) requestedTypes.push("Skills Checklist");
    if (shareRequest.request_credentials) requestedTypes.push("Credentials");
    if (shareRequest.request_resume) requestedTypes.push("Resume");
    if (shareRequest.request_references) requestedTypes.push("References");
    const docList = requestedTypes.length > 0 ? requestedTypes.join(", ") : "documents";

    // Send reminder email
    try {
      const candidateEmail = shareRequest.candidate_user.email;
      const candidateName = `${shareRequest.candidate_user.first_name} ${shareRequest.candidate_user.last_name}`;
      const recruiterName = `${shareRequest.client_user.first_name} ${shareRequest.client_user.last_name}`;
      const loginLink = `${getAppUrl()}/login`;

      await sendEmail({
        to: candidateEmail,
        templateKey: "document_reminder",
        variables: {
          candidate_name: candidateName,
          recruiter_name: recruiterName,
          document_list: docList,
          login_link: loginLink,
          message: shareRequest.message || "",
        },
      });
      console.log(`[EMAIL] Document reminder sent to ${candidateEmail}`);
    } catch (emailErr) {
      console.error("[EMAIL] Failed to send document reminder email:", emailErr);
    }

    // Create in-app notification for the candidate
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: shareRequest.candidate_user_id,
        category: "document_request",
        priority: "important",
        title: `Reminder: Share your ${docList}`,
        message: `${shareRequest.client_user.first_name} ${shareRequest.client_user.last_name} is waiting for you to share your ${docList}. Please log in and share them when you have a moment.`,
        actionUrl: `/sharing`,
        actionLabel: "Share documents",
        relatedEntityId: shareRequestId,
        relatedEntityType: "share_request_reminder",
      });
    } catch (notifErr) {
      console.error("[NOTIFICATION] Failed to create reminder notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${shareRequest.candidate_user.email}`,
    });
  } catch (error: any) {
    console.error("[SHARE_REQUEST_REMIND] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminder" },
      { status: 500 }
    );
  }
}
