import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * POST /api/candidate/checklists/request
 *
 * Candidate requests a specific checklist from admin.
 * Stored as a PlatformSetting entry with key 'checklist_request_{uuid}'.
 *
 * Body: {
 *   profession: string,
 *   specialty: string,
 *   requestedChecklist: string (template name or description),
 *   notes: string (optional),
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { profession, specialty, requestedChecklist, notes } = body;

    if (!requestedChecklist?.trim()) {
      return NextResponse.json(
        { error: "Please specify which checklist you need" },
        { status: 400 }
      );
    }

    // Get candidate name
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate unique request ID
    const requestId = crypto.randomBytes(8).toString("hex");
    const settingKey = `checklist_request_${requestId}`;

    // Store the request
    await db.platformSetting.create({
      data: {
        setting_key: settingKey,
        setting_value: JSON.stringify({
          id: requestId,
          candidateUserId: userId,
          candidateName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
          candidateEmail: user.email,
          profession: profession || "",
          specialty: specialty || "",
          requestedChecklist: requestedChecklist.trim(),
          notes: notes?.trim() || "",
          status: "pending",
        }),
      },
    });

    // Notify all super admins
    const superAdmins = await db.user.findMany({
      where: { role: "super_admin" },
      select: { id: true },
    });

    const { createNotification } = await import("@/lib/notifications/create");
    for (const admin of superAdmins) {
      try {
        await createNotification({
          userId: admin.id,
          category: "system",
          priority: "important",
          title: "New checklist request 📋",
          message: `${user.first_name || "A candidate"} requested a ${requestedChecklist} checklist.`,
          actionUrl: "/superadmin/skills/checklist-requests",
          actionLabel: "View Requests",
        });
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json(
      { success: true, message: "Request sent! Admin will assign your checklist soon." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CANDIDATE_CHECKLIST_REQUEST]", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
