import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/skills/checklist-requests
 *
 * Returns all checklist requests from candidates who want a specific
 * checklist assigned to them. Candidates can request checklists when
 * they don't have one for their specialty.
 *
 * Query params:
 *   status: "pending" | "fulfilled" | "rejected" | "all" (default: all)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";

    // For now, we'll query ChecklistRequest records where the candidate
    // has explicitly requested one. We use the 'requested_by_candidate'
    // flag on ChecklistRequest (if it exists) or we look at a separate
    // model. Since we don't have a separate model yet, we'll use
    // PlatformSetting with a key prefix to store requests.
    //
    // Actually, let's use a simpler approach: query ChecklistTemplate
    // and ChecklistRequest to find candidates who don't have a checklist
    // for their specialty. But the user's request is for candidates
    // who actively REQUEST a checklist from admin.
    //
    // We'll store these as PlatformSetting entries with key prefix
    // 'checklist_request_' until we add a proper model.

    const requests = await db.platformSetting.findMany({
      where: {
        setting_key: { startsWith: "checklist_request_" },
      },
      orderBy: { created_at: "desc" },
    });

    // Parse the stored requests
    const parsed = requests.map((r) => {
      try {
        const data = JSON.parse(r.setting_value);
        return {
          id: r.id,
          ...data,
          created_at: r.created_at,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Filter by status if needed
    const filtered = statusFilter === "all"
      ? parsed
      : parsed.filter((r: any) => r.status === statusFilter);

    return NextResponse.json({ requests: filtered });
  } catch (error) {
    console.error("[CHECKLIST_REQUESTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/skills/checklist-requests
 *
 * Actions:
 *   - { action: "fulfill", requestId, templateId } — Assign the checklist
 *   - { action: "reject", requestId, reason } — Reject the request
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, requestId } = body;

    // Find the request
    const requestRecord = await db.platformSetting.findUnique({
      where: { setting_key: `checklist_request_${requestId}` },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    let requestData;
    try {
      requestData = JSON.parse(requestRecord.setting_value);
    } catch {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    if (action === "fulfill") {
      const { templateId } = body;
      if (!templateId) {
        return NextResponse.json({ error: "Template ID required" }, { status: 400 });
      }

      // Create a ChecklistRequest for the candidate
      const newRequest = await db.checklistRequest.create({
        data: {
          client_user_id: Number((session.user as Record<string, unknown>).id), // Admin assigns as the requester
          candidate_user_id: requestData.candidateUserId,
          checklist_template_id: Number(templateId),
          status: "sent",
        },
      });

      // Update the request status
      requestData.status = "fulfilled";
      requestData.fulfilledAt = new Date().toISOString();
      requestData.checklistRequestId = newRequest.id;

      await db.platformSetting.update({
        where: { setting_key: `checklist_request_${requestId}` },
        data: { setting_value: JSON.stringify(requestData) },
      });

      // Notify the candidate
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: requestData.candidateUserId,
        category: "document",
        priority: "important",
        title: "Checklist assigned! 📋",
        message: `Your requested checklist has been assigned. Check your checklists page.`,
        actionUrl: "/checklists",
        actionLabel: "View Checklists",
        relatedEntityId: newRequest.id,
        relatedEntityType: "checklist_request",
      });

      return NextResponse.json({ success: true, message: "Checklist assigned and candidate notified" });
    }

    if (action === "reject") {
      const { reason } = body;
      requestData.status = "rejected";
      requestData.rejectedAt = new Date().toISOString();
      requestData.rejectionReason = reason || "No reason provided";

      await db.platformSetting.update({
        where: { setting_key: `checklist_request_${requestId}` },
        data: { setting_value: JSON.stringify(requestData) },
      });

      // Notify the candidate
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: requestData.candidateUserId,
        category: "system",
        priority: "info",
        title: "Checklist request update",
        message: `Your checklist request was not approved. ${reason || ""}`.trim(),
      });

      return NextResponse.json({ success: true, message: "Request rejected and candidate notified" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[CHECKLIST_REQUESTS_POST]", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
