import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(
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
            signers: true,
            creator: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
            organization: {
              select: { id: true, name: true },
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

    // Check signer hasn't already acted
    if (signer.status === "signed") {
      return NextResponse.json(
        { error: "You have already signed this document" },
        { status: 400 }
      );
    }

    if (signer.status === "declined") {
      return NextResponse.json(
        { error: "You have already declined this document" },
        { status: 400 }
      );
    }

    // Check document status
    if (doc.status === "expired" || doc.status === "voided" || doc.status === "declined" || doc.status === "completed") {
      return NextResponse.json(
        { error: "This document can no longer be acted upon" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    // Get IP address
    const ip_address =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    // Update signer status
    await db.vaultSignSigner.update({
      where: { id: signer.id },
      data: {
        status: "declined",
        declined_at: new Date(),
        decline_reason: reason || null,
        token_used: true,
        updated_at: new Date(),
      },
    });

    // Add audit trail event and update document status in a single atomic update
    const auditTrail = JSON.parse(doc.audit_trail || "[]");
    auditTrail.push({
      event: "document_declined",
      signer_id: signer.id,
      signer_name: signer.name,
      signer_email: signer.email,
      reason: reason || null,
      ip_address,
      timestamp: new Date().toISOString(),
    });
    await db.vaultSignDocument.update({
      where: { id: doc.id },
      data: {
        status: "declined",
        audit_trail: JSON.stringify(auditTrail),
        updated_at: new Date(),
      },
    });

    const recruiterName = `${doc.creator.first_name || ""} ${doc.creator.last_name || ""}`.trim() || doc.creator.email;
    const orgName = doc.organization.name;

    // Send decline notification to recruiter
    await sendEmail({
      to: doc.creator.email,
      templateKey: "vaultsign_declined",
      variables: {
        document_name: doc.document_name,
        signer_name: signer.name,
        signer_email: signer.email,
        decline_reason: reason || "No reason provided",
        agency_name: orgName,
      },
    });

    // Notify other pending signers that the document has been declined
    // Use the declined template (not voided) since the document was declined, not voided
    const otherPendingSigners = doc.signers.filter(
      (s) => s.id !== signer.id && (s.status === "sent" || s.status === "viewed" || s.status === "pending")
    );

    for (const otherSigner of otherPendingSigners) {
      await sendEmail({
        to: otherSigner.email,
        templateKey: "vaultsign_declined",
        variables: {
          document_name: doc.document_name,
          signer_name: signer.name,
          signer_email: signer.email,
          decline_reason: reason || "No reason provided",
          agency_name: orgName,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VAULTSIGN_SIGN_DECLINE]", error);
    return NextResponse.json(
      { error: "Failed to decline document" },
      { status: 500 }
    );
  }
}
