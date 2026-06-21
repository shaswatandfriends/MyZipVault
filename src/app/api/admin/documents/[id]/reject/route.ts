import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendCredentialRejectedEmail } from "@/lib/email";
import { logDocumentRejected } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const adminUserId = Number(session.user.id);

    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const credentialId = parseInt(id);

    const body = await request.json();
    const { review_notes } = body;

    const credential = await db.credential.findUnique({
      where: { id: credentialId },
      include: {
        candidate_user: { select: { email: true } },
      },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Set verification_status = "rejected", review_notes
    await db.credential.update({
      where: { id: credentialId },
      data: {
        verification_status: "rejected",
        reviewed_by: adminUserId,
        review_notes: review_notes || null,
      },
    });

    // Send email to candidate
    if (credential.candidate_user?.email) {
      await sendCredentialRejectedEmail(
        credential.candidate_user.email,
        credential.document_name,
        review_notes || "No specific feedback provided"
      );
    }

    // Audit log
    await logDocumentRejected(adminUserId, 'platform_admin', credentialId);

    // ─── Notification: document rejected (to candidate) ───
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: credential.candidate_user_id,
        category: "document",
        priority: "important",
        title: "Document rejected ❌",
        message: `Your ${credential.document_name} was rejected. ${review_notes || "Please re-upload."}`,
        actionUrl: "/vault/credentials",
        actionLabel: "View document",
        relatedEntityId: credential.id,
        relatedEntityType: "credential",
      });
    } catch (notifErr) {
      console.error("[ADMIN_DOCUMENT_REJECT] Failed to send notification:", notifErr);
      // Non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_DOCUMENT_REJECT]", error);
    return NextResponse.json(
      { error: "Failed to reject credential" },
      { status: 500 }
    );
  }
}
