import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDocumentDeclinedEmail } from "@/lib/vaultsign/email";
import type { AuditTrailEntry } from "@/lib/vaultsign/types";

// POST: Mark signer as declined with reason
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const signer = await db.vaultSignSigner.findUnique({
      where: { sign_token: token },
      include: {
        document: {
          include: {
            signers: true,
            creator: { select: { id: true, first_name: true, last_name: true, email: true } },
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json({ error: "Invalid signing link" }, { status: 404 });
    }

    if (signer.status === "signed") {
      return NextResponse.json({ error: "You have already signed this document" }, { status: 400 });
    }

    if (signer.document.status === "voided" || signer.document.status === "expired" || signer.document.status === "completed") {
      return NextResponse.json({ error: "Document is no longer actionable" }, { status: 410 });
    }

    const body = await request.json();
    const { reason } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Update signer status
    await db.vaultSignSigner.update({
      where: { id: signer.id },
      data: {
        status: "declined",
        declined_at: new Date(),
        decline_reason: reason || null,
        ip_address: ipAddress,
        device_info: userAgent.substring(0, 500),
      },
    });

    // Update document status to "declined"
    const auditTrail: AuditTrailEntry[] = JSON.parse(signer.document.audit_trail || "[]");
    auditTrail.push({
      event: "document_declined",
      user_name: signer.name,
      ip_address: ipAddress,
      device_info: userAgent.substring(0, 200),
      timestamp: new Date().toISOString(),
    });

    await db.vaultSignDocument.update({
      where: { id: signer.document.id },
      data: {
        status: "declined",
        audit_trail: JSON.stringify(auditTrail),
        updated_at: new Date(),
      },
    });

    // Send notification email to the document creator
    const creator = signer.document.creator;
    if (creator) {
      await sendDocumentDeclinedEmail({
        senderEmail: creator.email,
        senderName: `${creator.first_name || ""} ${creator.last_name || ""}`.trim() || creator.email,
        documentName: signer.document.document_name,
        signerName: signer.name,
        declineReason: reason || undefined,
      });
    }

    return NextResponse.json({ success: true, status: "declined" });
  } catch (error) {
    console.error("[VAULTSIGN] Decline signature error:", error);
    return NextResponse.json({ error: "Failed to decline" }, { status: 500 });
  }
}
