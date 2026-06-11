import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendDocumentVoidedEmail } from "@/lib/vaultsign/email";
import type { AuditTrailEntry } from "@/lib/vaultsign/types";

// POST: Void the document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: docId },
      include: { signers: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only sent or partially_signed documents can be voided
    if (!["sent", "partially_signed"].includes(document.status)) {
      return NextResponse.json({ error: "Document cannot be voided in its current status" }, { status: 400 });
    }

    // Check access
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update document status
    const auditTrail: AuditTrailEntry[] = JSON.parse(document.audit_trail || "[]");
    const voidedByName = `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim() || session.user.email;

    auditTrail.push({
      event: "document_voided",
      user_name: voidedByName,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      timestamp: new Date().toISOString(),
    });

    await db.vaultSignDocument.update({
      where: { id: docId },
      data: {
        status: "voided",
        audit_trail: JSON.stringify(auditTrail),
        updated_at: new Date(),
      },
    });

    // Send voided emails to all non-signed signers
    for (const signer of document.signers) {
      if (signer.status !== "signed" && signer.status !== "declined") {
        await sendDocumentVoidedEmail({
          signerEmail: signer.email,
          signerName: signer.name,
          documentName: document.document_name,
          voidedByName,
        });
      }
    }

    return NextResponse.json({ success: true, status: "voided" });
  } catch (error) {
    console.error("[VAULTSIGN] Void document error:", error);
    return NextResponse.json({ error: "Failed to void document" }, { status: 500 });
  }
}
