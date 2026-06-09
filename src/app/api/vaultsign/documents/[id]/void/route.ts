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
        { error: "Only the document creator can void it" },
        { status: 403 }
      );
    }

    if (document.status !== "sent" && document.status !== "partially_signed") {
      return NextResponse.json(
        { error: "Only sent or partially signed documents can be voided" },
        { status: 400 }
      );
    }

    const recruiterName = `${document.creator.first_name || ""} ${document.creator.last_name || ""}`.trim() || document.creator.email;
    const orgName = document.organization.name;

    // Update document status to voided
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: {
        status: "voided",
        updated_at: new Date(),
      },
    });

    // Notify all pending signers
    const pendingSigners = document.signers.filter(
      (s) => s.status === "sent" || s.status === "viewed" || s.status === "pending"
    );

    for (const signer of pendingSigners) {
      await sendEmail({
        to: signer.email,
        templateKey: "vaultsign_voided",
        variables: {
          document_name: document.document_name,
          sender_name: recruiterName,
          agency_name: orgName,
        },
      });
    }

    // Add audit trail event
    const auditTrail = JSON.parse(document.audit_trail || "[]");
    auditTrail.push({
      event: "document_voided",
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
        action: "void_vaultsign_document",
        entity_type: "vaultsign_document",
        entity_id: documentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_VOID]", error);
    return NextResponse.json(
      { error: "Failed to void document" },
      { status: 500 }
    );
  }
}
