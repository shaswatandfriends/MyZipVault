import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; signerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "client_recruiter") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { id, signerId } = await params;
    const documentId = parseInt(id, 10);
    const signerIdNum = parseInt(signerId, 10);

    if (isNaN(documentId) || isNaN(signerIdNum)) {
      return NextResponse.json(
        { error: "Invalid document or signer ID" },
        { status: 400 }
      );
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: documentId },
      include: {
        signers: true,
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.created_by_user_id !== userId) {
      return NextResponse.json(
        { error: "Only the document creator can send reminders" },
        { status: 403 }
      );
    }

    const signer = document.signers.find((s) => s.id === signerIdNum);
    if (!signer) {
      return NextResponse.json({ error: "Signer not found" }, { status: 404 });
    }

    // Check signer is in a pending state
    if (signer.status !== "sent" && signer.status !== "viewed") {
      return NextResponse.json(
        { error: "Signer is not in a pending state" },
        { status: 400 }
      );
    }

    // Check if a reminder was sent within the last 24 hours
    const lastReminder = await db.vaultSignReminder.findFirst({
      where: { signer_id: signerIdNum },
      orderBy: { sent_at: "desc" },
    });

    if (lastReminder) {
      const hoursSinceLastReminder =
        (Date.now() - new Date(lastReminder.sent_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastReminder < 24) {
        return NextResponse.json(
          { error: "A reminder was already sent within the last 24 hours" },
          { status: 429 }
        );
      }
    }

    const recruiterName = `${document.creator.first_name || ""} ${document.creator.last_name || ""}`.trim() || document.creator.email;
    const orgName = document.organization.name;

    // Send reminder email
    await sendEmail({
      to: signer.email,
      templateKey: "vaultsign_reminder",
      variables: {
        sender_name: recruiterName,
        agency_name: orgName,
        document_name: document.document_name,
        personal_message: document.personal_message || "",
        expiry_date: new Date(document.expiry_date).toLocaleDateString(),
        signing_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/sign/${signer.sign_token}`,
      },
    });

    // Create reminder record
    await db.vaultSignReminder.create({
      data: {
        document_id: documentId,
        signer_id: signerIdNum,
        reminder_type: "manual",
        sent_at: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: "client_recruiter",
        action: "send_vaultsign_reminder",
        entity_type: "vaultsign_signer",
        entity_id: signerIdNum,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_REMIND]", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
