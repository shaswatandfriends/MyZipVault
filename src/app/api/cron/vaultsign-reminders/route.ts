import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendReminderEmail, generateSigningLink } from "@/lib/vaultsign/email";

// Cron job: Send automatic reminders to signers who haven't signed yet
// Called by external cron service or manually
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {

    const now = new Date();

    // Find documents that are sent or partially_signed, not expired, not voided
    const documents = await db.vaultSignDocument.findMany({
      where: {
        status: { in: ["sent", "partially_signed"] },
        expiry_date: { gt: now },
      },
      include: {
        signers: true,
        organization: { select: { name: true } },
      },
    });

    let remindersSent = 0;

    for (const doc of documents) {
      // Find pending/sent signers
      const pendingSigners = doc.signers.filter(
        (s) => s.status === "sent" || s.status === "viewed" || s.status === "pending"
      );

      for (const signer of pendingSigners) {
        // Check if we've already sent a reminder in the last 24 hours
        const recentReminder = await db.vaultSignReminder.findFirst({
          where: {
            signer_id: signer.id,
            reminder_type: "auto",
            sent_at: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentReminder) continue;

        // Check if signer was invited more than 24 hours ago
        const signerCreated = new Date(signer.created_at);
        const hoursSinceInvited = (now.getTime() - signerCreated.getTime()) / (1000 * 60 * 60);
        if (hoursSinceInvited < 24) continue;

        // Send reminder
        await sendReminderEmail({
          signerName: signer.name,
          signerEmail: signer.email,
          documentName: doc.document_name,
          senderName: doc.organization?.name || "MyZipVault",
          organizationName: doc.organization?.name || "MyZipVault",
          signingLink: generateSigningLink(signer.sign_token),
          reminderType: "auto",
          expiryDate: doc.expiry_date.toISOString().split("T")[0],
        });

        // Record reminder
        await db.vaultSignReminder.create({
          data: {
            document_id: doc.id,
            signer_id: signer.id,
            reminder_type: "auto",
          },
        });

        remindersSent++;
      }
    }

    return NextResponse.json({
      success: true,
      documentsChecked: documents.length,
      remindersSent,
    });
  } catch (error) {
    console.error("[VAULTSIGN] Reminders cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
