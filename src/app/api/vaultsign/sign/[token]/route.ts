import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find signer by sign_token
    const signer = await db.vaultSignSigner.findUnique({
      where: { sign_token: token },
      include: {
        document: {
          include: {
            signers: {
              orderBy: { signing_order_position: "asc" },
            },
            creator: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json(
        { error: "Invalid signing token" },
        { status: 404 }
      );
    }

    const doc = signer.document;

    // Check if token has already been used and signer has signed
    if (signer.token_used && signer.status === "signed") {
      return NextResponse.json(
        { error: "This signing link has already been used" },
        { status: 410 }
      );
    }

    // Check document status
    if (doc.status === "expired") {
      return NextResponse.json(
        { error: "This document has expired" },
        { status: 410 }
      );
    }

    if (doc.status === "voided") {
      return NextResponse.json(
        { error: "This document has been voided" },
        { status: 410 }
      );
    }

    if (doc.status === "declined") {
      return NextResponse.json(
        { error: "This document has been declined" },
        { status: 410 }
      );
    }

    if (doc.status === "completed") {
      return NextResponse.json(
        { error: "This document has already been completed" },
        { status: 410 }
      );
    }

    // If sequential signing: check if it's this signer's turn
    if (doc.signing_order === "sequential") {
      const signerPosition = signer.signing_order_position;
      const previousSigners = doc.signers.filter(
        (s) => s.signing_order_position < signerPosition
      );
      const unsignedPrevious = previousSigners.filter(
        (s) => s.status !== "signed"
      );

      if (unsignedPrevious.length > 0) {
        const waitingFor = unsignedPrevious[0];
        return NextResponse.json({
          waitingFor: waitingFor.name,
          message: `This document requires ${waitingFor.name} to sign before you.`,
        });
      }
    }

    // Generate signed URL for the document PDF (15 min)
    let documentUrl: string | null = null;
    if (doc.original_document_url) {
      documentUrl = await getSignedUrl(
        "vaultsign-documents",
        doc.original_document_url,
        900
      );
    }

    // Filter sign_fields to only include this signer's fields
    const allSignFields = JSON.parse(doc.sign_fields || "[]");
    const signerFields = allSignFields.filter(
      (f: Record<string, unknown>) => f.assigned_to_signer_id === signer.id
    );

    // Build other signers info (name + status only)
    const otherSigners = doc.signers
      .filter((s) => s.id !== signer.id)
      .map((s) => ({
        name: s.name,
        role: s.role,
        status: s.status,
      }));

    // Update signer status to 'viewed' if currently 'sent'
    if (signer.status === "sent") {
      await db.vaultSignSigner.update({
        where: { id: signer.id },
        data: {
          status: "viewed",
          updated_at: new Date(),
        },
      });

      // Add audit trail event
      const auditTrail = JSON.parse(doc.audit_trail || "[]");
      auditTrail.push({
        event: "document_viewed",
        signer_id: signer.id,
        signer_name: signer.name,
        signer_email: signer.email,
        timestamp: new Date().toISOString(),
      });
      await db.vaultSignDocument.update({
        where: { id: doc.id },
        data: { audit_trail: JSON.stringify(auditTrail) },
      });
    }

    return NextResponse.json({
      document_name: doc.document_name,
      document_url: documentUrl,
      signer_name: signer.name,
      signer_role: signer.role,
      sign_fields: signerFields,
      personal_message: doc.personal_message,
      other_signers: otherSigners,
      signing_order: doc.signing_order,
      expiry_date: doc.expiry_date,
    });
  } catch (error) {
    console.error("[VAULTSIGN_SIGN_GET]", error);
    return NextResponse.json(
      { error: "Failed to validate signing token" },
      { status: 500 }
    );
  }
}
