import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendDocumentSentEmail, generateSigningLink } from "@/lib/vaultsign/email";
import type { AuditTrailEntry } from "@/lib/vaultsign/types";

// POST: Validate document has signers and sign fields, change status to "sent", send emails
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
      include: {
        signers: { orderBy: { signing_order_position: "asc" } },
        organization: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only draft documents can be sent
    if (document.status !== "draft") {
      return NextResponse.json({ error: "Only draft documents can be sent" }, { status: 400 });
    }

    // Check access
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate signers
    if (!document.signers || document.signers.length === 0) {
      return NextResponse.json({ error: "At least one signer is required" }, { status: 400 });
    }

    // Validate sign fields
    const signFields = JSON.parse(document.sign_fields || "[]");
    if (signFields.length === 0) {
      return NextResponse.json({ error: "At least one sign field is required" }, { status: 400 });
    }

    // Check that every signer has at least one field assigned
    const signerIndices = new Set(signFields.map((f: any) => f.assigned_to_signer_index));
    for (const signer of document.signers) {
      if (!signerIndices.has(signer.signer_index)) {
        return NextResponse.json({
          error: `Signer "${signer.name}" has no fields assigned`,
        }, { status: 400 });
      }
    }

    // Update document status to "sent"
    const auditTrail: AuditTrailEntry[] = JSON.parse(document.audit_trail || "[]");
    auditTrail.push({
      event: "document_sent",
      user_name: `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim() || session.user.email,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      timestamp: new Date().toISOString(),
    });

    await db.vaultSignDocument.update({
      where: { id: docId },
      data: {
        status: "sent",
        audit_trail: JSON.stringify(auditTrail),
        updated_at: new Date(),
      },
    });

    // Determine which signers should receive emails based on signing order
    const signersToNotify = document.signing_order === "sequential"
      ? [document.signers[0]] // Only first signer in sequential
      : document.signers; // All signers in parallel

    // Send emails to relevant signers
    const senderName = `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim() || session.user.email;
    const orgName = document.organization?.name || "MyZipVault";

    for (const signer of signersToNotify) {
      if (!signer) continue;

      const signingLink = generateSigningLink(signer.sign_token);

      // Update signer status to "sent"
      await db.vaultSignSigner.update({
        where: { id: signer.id },
        data: { status: "sent" },
      });

      // Send email
      await sendDocumentSentEmail({
        signerName: signer.name,
        signerEmail: signer.email,
        documentName: document.document_name,
        senderName,
        organizationName: orgName,
        signingLink,
        personalMessage: document.personal_message || undefined,
        expiryDate: document.expiry_date.toISOString().split("T")[0],
      });
    }

    return NextResponse.json({ success: true, status: "sent" });
  } catch (error) {
    console.error("[VAULTSIGN] Send document error:", error);
    return NextResponse.json({ error: "Failed to send document" }, { status: 500 });
  }
}
