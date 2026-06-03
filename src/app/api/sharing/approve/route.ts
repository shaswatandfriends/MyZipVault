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
    const { shareRequestId, itemType, itemId, expiryDays } = body;

    if (!shareRequestId || !itemType || !expiryDays) {
      return NextResponse.json(
        { error: "Share request ID, item type, and expiry days are required" },
        { status: 400 }
      );
    }

    const shareRequest = await db.shareRequest.findFirst({
      where: {
        id: shareRequestId,
        candidate_user_id: userId,
        status: "pending",
      },
    });

    if (!shareRequest) {
      return NextResponse.json(
        { error: "Share request not found or already actioned" },
        { status: 404 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const consentData: Record<string, unknown> = {
      candidate_user_id: userId,
      client_user_id: shareRequest.client_user_id,
      expires_at: expiresAt,
    };

    if (itemType === "checklist" && itemId) {
      consentData.checklist_response_id = itemId;
    } else if (itemType === "credential" && itemId) {
      consentData.credential_id = itemId;
    } else if (itemType === "resume" && itemId) {
      consentData.resume_id = itemId;
    } else if (itemType === "reference" && itemId) {
      consentData.reference_id = itemId;
    }

    await db.consentShare.create({
      data: consentData as Parameters<typeof db.consentShare.create>[0]["data"],
    });

    // Check if all items in the request have been actioned
    await db.notification.create({
      data: {
        user_id: userId,
        message: `You approved sharing your ${itemType} with a recruiter`,
        type: "share_approved",
        related_entity_id: shareRequestId,
      },
    });

    return NextResponse.json({
      message: "Sharing approved successfully",
    });
  } catch (error) {
    console.error("Share approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve sharing" },
      { status: 500 }
    );
  }
}
