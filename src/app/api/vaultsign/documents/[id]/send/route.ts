import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

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
    if (userRole !== "client_recruiter") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { id } = await params;
    const documentId = parseInt(id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: documentId },
      include: {
        signers: { orderBy: { signing_order_position: "asc" } },
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
        { error: "Only the document creator can send it" },
        { status: 403 }
      );
    }

    if (document.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft documents can be sent" },
        { status: 400 }
      );
    }

    if (!document.original_document_url) {
      return NextResponse.json(
        { error: "Document must have a PDF uploaded before sending" },
        { status: 400 }
      );
    }

    const recruiterName = `${document.creator.first_name || ""} ${document.creator.last_name || ""}`.trim() || document.creator.email;
    const orgName = document.organization.name;

    // Update document status
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: {
        status: "sent",
        updated_at: new Date(),
      },
    });

    // Update all signers to 'sent' status
    await db.vaultSignSigner.updateMany({
      where: { document_id: documentId },
      data: { status: "sent", updated_at: new Date() },
    });

    // Determine which signers to email based on signing order
    let signersToEmail: typeof document.signers;

    if (document.signing_order === "sequential") {
      // Only send to the first signer
      signersToEmail = document.signers.filter(
        (s) => s.signing_order_position === 1
      );
    } else {
      // Parallel: send to all signers
      signersToEmail = document.signers;
    }

    // Send invitation emails
    for (const signer of signersToEmail) {
      await sendEmail({
        to: signer.email,
        templateKey: "vaultsign_invitation",
        variables: {
          sender_name: recruiterName,
          agency_name: orgName,
          document_name: document.document_name,
          personal_message: document.personal_message || "",
          expiry_date: new Date(document.expiry_date).toLocaleDateString(),
          signing_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/sign/${signer.sign_token}`,
        },
      });
    }

    // Add audit trail event
    const auditTrail = JSON.parse(document.audit_trail || "[]");
    auditTrail.push({
      event: "document_sent",
      user_id: userId,
      name: recruiterName,
      timestamp: new Date().toISOString(),
    });
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: { audit_trail: JSON.stringify(auditTrail) },
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: "client_recruiter",
        action: "send_vaultsign_document",
        entity_type: "vaultsign_document",
        entity_id: documentId,
      },
    });

    return NextResponse.json({ success: true, signersEmailed: signersToEmail.length });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_SEND]", error);
    return NextResponse.json(
      { error: "Failed to send document" },
      { status: 500 }
    );
  }
}
