import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    // Verify CRON_SECRET header for security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const providedSecret = request.headers.get("x-cron-secret");
      if (providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    let expiredCount = 0;

    // Find all documents that are sent or partially_signed and have passed expiry_date
    const expiredDocuments = await db.vaultSignDocument.findMany({
      where: {
        status: { in: ["sent", "partially_signed"] },
        expiry_date: { lt: now },
      },
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

    for (const doc of expiredDocuments) {
      // Update document status to expired
      await db.vaultSignDocument.update({
        where: { id: doc.id },
        data: {
          status: "expired",
          updated_at: new Date(),
        },
      });

      // Add audit trail event
      const auditTrail = JSON.parse(doc.audit_trail || "[]");
      auditTrail.push({
        event: "document_expired",
        timestamp: new Date().toISOString(),
      });
      await db.vaultSignDocument.update({
        where: { id: doc.id },
        data: { audit_trail: JSON.stringify(auditTrail) },
      });

      const recruiterName = `${doc.creator.first_name || ""} ${doc.creator.last_name || ""}`.trim() || doc.creator.email;
      const orgName = doc.organization.name;

      // Notify the recruiter
      await sendEmail({
        to: doc.creator.email,
        templateKey: "vaultsign_expired",
        variables: {
          document_name: doc.document_name,
          agency_name: orgName,
          expiry_date: new Date(doc.expiry_date).toLocaleDateString(),
        },
      });

      // Notify pending signers
      const pendingSigners = doc.signers.filter(
        (s) => s.status === "sent" || s.status === "viewed" || s.status === "pending"
      );

      for (const signer of pendingSigners) {
        await sendEmail({
          to: signer.email,
          templateKey: "vaultsign_expired",
          variables: {
            document_name: doc.document_name,
            agency_name: orgName,
            expiry_date: new Date(doc.expiry_date).toLocaleDateString(),
          },
        });
      }

      expiredCount++;
    }

    return NextResponse.json({ expiredCount });
  } catch (error) {
    console.error("[CRON_VAULTSIGN_EXPIRY]", error);
    return NextResponse.json(
      { error: "Failed to process expired documents" },
      { status: 500 }
    );
  }
}
