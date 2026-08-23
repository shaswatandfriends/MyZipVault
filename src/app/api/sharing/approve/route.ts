import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logCandidateShared } from "@/lib/audit";
import { requireEmailVerified } from "@/lib/email-verification";
import { shareApproveSchema, validateBody } from "@/lib/validation-schemas";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Require email verification (Gap 5)
    const verificationCheck = await requireEmailVerified(userId);
    if (!verificationCheck.allowed) return verificationCheck.errorResponse!;

    const body = await request.json();

    // ─── Zod validation ───
    const validation = validateBody(shareApproveSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { shareRequestId, itemType, itemId, expiryDays } = validation.data;

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

    const consentShare = await db.consentShare.create({
      data: consentData as Parameters<typeof db.consentShare.create>[0]["data"],
    });

    // Audit log
    await logCandidateShared(userId, consentShare.id);

    // Check if all items in the request have been actioned
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId,
      category: "document",
      priority: "important",
      title: "Sharing approved",
      message: `You approved sharing your ${itemType} with a recruiter`,
      relatedEntityId: shareRequestId,
      relatedEntityType: "share_request",
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
