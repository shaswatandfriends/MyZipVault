import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import type { AuditTrailEntry } from "@/lib/vaultsign/types";

// GET: Get document info for signing page (by signer token — no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find the signer by token
    const signer = await db.vaultSignSigner.findUnique({
      where: { sign_token: token },
      include: {
        document: {
          include: {
            signers: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                signer_index: true,
                status: true,
                signed_at: true,
              },
              orderBy: { signing_order_position: "asc" },
            },
            organization: {
              select: { name: true, company_logo_url: true },
            },
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json({ error: "Invalid signing link" }, { status: 404 });
    }

    const document = signer.document;

    // Check if document is still actionable
    if (document.status === "voided") {
      return NextResponse.json({ error: "This document has been voided" }, { status: 410 });
    }
    if (document.status === "expired") {
      return NextResponse.json({ error: "This document has expired" }, { status: 410 });
    }
    if (document.status === "completed") {
      return NextResponse.json({ error: "This document has already been completed" }, { status: 410 });
    }

    // Check if this signer has already signed
    if (signer.status === "signed") {
      return NextResponse.json({ error: "You have already signed this document", already_signed: true }, { status: 400 });
    }

    // Check if this signer's turn (for sequential signing)
    if (document.signing_order === "sequential") {
      const signersOrdered = document.signers.sort((a: any, b: any) =>
        (a.signing_order_position || 1) - (b.signing_order_position || 1)
      );
      const currentSignerIndex = signersOrdered.findIndex((s: any) => s.id === signer.id);
      const previousSigners = signersOrdered.slice(0, currentSignerIndex);
      const allPreviousSigned = previousSigners.every((s: any) => s.status === "signed");

      if (!allPreviousSigned) {
        return NextResponse.json({
          error: "It is not your turn to sign yet. Previous signers must sign first.",
          waiting_for_others: true,
        }, { status: 400 });
      }
    }

    // Get the PDF URL for the document
    let pdfUrl = "";
    if (document.source_type === "pdf" && document.original_file_url) {
      pdfUrl = await getDocumentSignedUrl(document.original_file_url);
    } else if (document.edited_pdf_url) {
      pdfUrl = await getDocumentSignedUrl(document.edited_pdf_url);
    } else if (document.original_file_url) {
      pdfUrl = await getDocumentSignedUrl(document.original_file_url);
    }

    // Filter sign fields to only show this signer's fields
    const allFields = JSON.parse(document.sign_fields || "[]");
    const myFields = allFields.filter((f: any) => f.assigned_to_signer_index === signer.signer_index);

    // Update signer status to "viewed" if still "sent"
    if (signer.status === "sent") {
      await db.vaultSignSigner.update({
        where: { id: signer.id },
        data: { status: "viewed" },
      });

      // Add audit trail entry
      const auditTrail: AuditTrailEntry[] = JSON.parse(document.audit_trail || "[]");
      auditTrail.push({
        event: "document_viewed",
        user_name: signer.name,
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        timestamp: new Date().toISOString(),
      });

      await db.vaultSignDocument.update({
        where: { id: document.id },
        data: {
          audit_trail: JSON.stringify(auditTrail),
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      document: {
        id: document.id,
        document_name: document.document_name,
        document_type: document.document_type,
        source_type: document.source_type,
        signing_order: document.signing_order,
        expiry_date: document.expiry_date,
        status: document.status,
        personal_message: document.personal_message,
        sign_fields: myFields,
        all_sign_fields: allFields,
        placeholder_values: JSON.parse(document.placeholder_values || "{}"),
        pdf_url: pdfUrl,
        organization: document.organization,
      },
      signer: {
        id: signer.id,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        signer_index: signer.signer_index,
        status: signer.status === "sent" ? "viewed" : signer.status,
        user_id: signer.user_id,
      },
      all_signers: document.signers.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        signer_index: s.signer_index,
        status: s.status,
        signed_at: s.signed_at,
      })),
    });
  } catch (error) {
    console.error("[VAULTSIGN] Get signing info error:", error);
    return NextResponse.json({ error: "Failed to get signing info" }, { status: 500 });
  }
}
