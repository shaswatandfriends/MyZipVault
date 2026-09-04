import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";

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
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const checklistRequestId = Number(id);

    // Find the checklist request
    const checklistRequest = await (async () => {
      try {
        return await db.checklistRequest.findUnique({
          where: { id: checklistRequestId },
          include: {
            candidate_user: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
            checklist_template: {
              select: { name: true },
            },
          },
        });
      } catch (e) {
        console.error("[SCHEMA_DRIFT] query failed:", e);
        return null;
      }
    })();

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist request not found" },
        { status: 404 }
      );
    }

    // Don't send reminder if already completed
    if (checklistRequest.status === "completed") {
      return NextResponse.json(
        { error: "Checklist is already completed" },
        { status: 400 }
      );
    }

    // Check 24-hour cooldown based on last reminder sent (not request creation time)
    // FIX #5: Was using checklistRequest.created_at (when request was first sent)
    //         Now checks for recent Notification rows for this request
    const recentReminder = await db.notification.findFirst({
      where: {
        user_id: checklistRequest.candidate_user_id,
        category: "checklist",
        related_entity_id: requestId,
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentReminder) {
      return NextResponse.json(
        { error: "A reminder was already sent recently. Please wait 24 hours." },
        { status: 429 }
      );
    }

    // Send reminder email
    try {
      const candidateEmail = checklistRequest.candidate_user.email;
      const candidateName = `${checklistRequest.candidate_user.first_name} ${checklistRequest.candidate_user.last_name}`;
      const checklistName = checklistRequest.checklist_template.name;
      const loginLink = `${getAppUrl()}/login`;

      await sendEmail({
        to: candidateEmail,
        templateKey: "checklist_reminder",
        variables: {
          candidate_name: candidateName,
          checklist_name: checklistName,
          login_link: loginLink,
        },
      });
      console.log(`[EMAIL] Checklist reminder sent to ${candidateEmail}`);
    } catch (emailErr) {
      console.error("[EMAIL] Failed to send reminder email:", emailErr);
    }

    // Also create an in-app notification (shares cooldown state with /api/recruiter/send-reminder)
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: checklistRequest.candidate_user_id,
        category: "checklist",
        priority: "info",
        title: `Reminder: ${checklistRequest.checklist_template?.name || "Skills Checklist"}`,
        message: `This is a friendly reminder to complete your skills checklist.`,
        actionUrl: `/checklists/${requestId}`,
        actionLabel: "Complete now",
        relatedEntityId: requestId,
        relatedEntityType: "checklist_request",
      });
    } catch (notifErr) {
      console.error("[REMIND] Failed to create in-app notification:", notifErr);
    }

    // Audit log
    try {
      const session = await getServerSession(authOptions);
      await db.auditLog.create({
        data: {
          user_id: Number((session?.user as Record<string, unknown>)?.id || 0),
          role: (session?.user as Record<string, unknown>)?.role as string || "unknown",
          action: "CHECKLIST_REMIND",
          entity_type: "ChecklistRequest",
          entity_id: requestId,
        },
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${checklistRequest.candidate_user.email}`,
    });
  } catch (error) {
    console.error("Remind POST error:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
