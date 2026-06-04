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

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { shareRequestId, itemType } = body;

    if (!shareRequestId) {
      return NextResponse.json(
        { error: "Share request ID is required" },
        { status: 400 }
      );
    }

    const shareRequest = await db.shareRequest.findFirst({
      where: {
        id: shareRequestId,
        candidate_user_id: userId,
      },
    });

    if (!shareRequest) {
      return NextResponse.json(
        { error: "Share request not found" },
        { status: 404 }
      );
    }

    // Mark request as denied by removing the requested item
    const updateData: Record<string, boolean> = {};
    if (itemType === "checklist") updateData.request_checklists = false;
    if (itemType === "credential") updateData.request_credentials = false;
    if (itemType === "resume") updateData.request_resume = false;
    if (itemType === "reference") updateData.request_references = false;

    // Check if all items are now denied
    const updated = { ...shareRequest, ...updateData };
    const allDenied =
      !updated.request_checklists &&
      !updated.request_credentials &&
      !updated.request_resume &&
      !updated.request_references;

    await db.shareRequest.update({
      where: { id: shareRequestId },
      data: {
        ...updateData,
        status: allDenied ? "denied" : "pending",
      },
    });

    await db.notification.create({
      data: {
        user_id: userId,
        message: `You denied sharing your ${itemType || "document"} with a recruiter`,
        type: "share_denied",
        related_entity_id: shareRequestId,
      },
    });

    return NextResponse.json({
      message: "Sharing denied",
    });
  } catch (error) {
    console.error("Share deny error:", error);
    return NextResponse.json(
      { error: "Failed to deny sharing" },
      { status: 500 }
    );
  }
}
