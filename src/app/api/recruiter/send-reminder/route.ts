import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { candidateId, checklistRequestId, type } = body as {
      candidateId?: number;
      checklistRequestId?: number;
      type?: string;
    };

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    }

    // Verify the candidate has a checklist request from this organization
    const orgUsers = await db.user.findMany({
      where: { organization_id: organizationId, role: { in: ["client_recruiter", "client_admin"] } },
      select: { id: true },
    });
    const orgUserIds = orgUsers.map((u) => u.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let checklistRequest: any = null;
    try {
      checklistRequest = checklistRequestId
        ? await db.checklistRequest.findFirst({
            where: {
              id: checklistRequestId,
              candidate_user_id: candidateId,
              client_user_id: { in: orgUserIds },
              status: { in: ["sent", "opened", "in_progress"] },
            },
            include: {
              checklist_template: { select: { name: true } },
              candidate_user: {
                select: { first_name: true, last_name: true, email: true },
              },
            },
          })
        : await db.checklistRequest.findFirst({
            where: {
              candidate_user_id: candidateId,
              client_user_id: { in: orgUserIds },
              status: { in: ["sent", "opened", "in_progress"] },
            },
            include: {
              checklist_template: { select: { name: true } },
              candidate_user: {
                select: { first_name: true, last_name: true, email: true },
              },
            },
            orderBy: { created_at: "desc" },
          });
    } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "No pending checklist request found for this candidate from your organization" },
        { status: 404 }
      );
    }

    // Check if a reminder was already sent recently (within last 24 hours)
    const recentReminder = await db.notification.findFirst({
      where: {
        user_id: candidateId,
        type: "checklist_reminder",
        related_entity_id: checklistRequest.id,
        related_entity_type: "checklist_request",
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
        },
      },
      orderBy: { created_at: "desc" },
    });

    if (recentReminder) {
      return NextResponse.json(
        { error: "A reminder was already sent to this candidate within the last 24 hours. Please wait before sending another." },
        { status: 429 }
      );
    }

    // Get sender info
    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, organization: { select: { name: true } } },
    });

    const senderName = sender?.first_name
      ? `${sender.first_name} ${sender.last_name}`
      : sender?.organization?.name ?? "A recruiter";

    const checklistName = checklistRequest.checklist_template.name;
    const candidateName = checklistRequest.candidate_user.first_name
      ? `${checklistRequest.candidate_user.first_name} ${checklistRequest.candidate_user.last_name}`
      : checklistRequest.candidate_user.email;

    // Create the in-app notification for the candidate
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId: candidateId,
      category: "compliance",
      priority: "info",
      title: "Reminder: Complete Your Checklist",
      message: `${senderName} sent you a reminder to complete your "${checklistName}" checklist. Please log in to complete it at your earliest convenience.`,
      relatedEntityId: checklistRequest.id,
      relatedEntityType: "checklist_request",
      metadata: {
        checklistRequestId: checklistRequest.id,
        checklistName,
        senderId: userId,
        senderName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reminder sent to candidate",
    });
  } catch (error) {
    console.error("[RECRUITER_SEND_REMINDER]", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
