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
    let remindersSent = 0;

    // Get the reminder interval from platform settings (default 3 days)
    const reminderDaysSetting = await db.platformSetting.findUnique({
      where: { setting_key: "vaultsign_reminder_days" },
    });
    const reminderDays = reminderDaysSetting
      ? parseInt(reminderDaysSetting.setting_value, 10) || 3
      : 3;

    // Find all documents that are sent or partially_signed and not expired
    const activeDocuments = await db.vaultSignDocument.findMany({
      where: {
        status: { in: ["sent", "partially_signed"] },
        expiry_date: { gt: now },
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

    for (const doc of activeDocuments) {
      const recruiterName = `${doc.creator.first_name || ""} ${doc.creator.last_name || ""}`.trim() || doc.creator.email;
      const orgName = doc.organization.name;

      // Find pending signers (sent or viewed)
      const pendingSigners = doc.signers.filter(
        (s) => s.status === "sent" || s.status === "viewed"
      );

      for (const signer of pendingSigners) {
        // Check if a reminder was sent recently
        const lastReminder = await db.vaultSignReminder.findFirst({
          where: { signer_id: signer.id },
          orderBy: { sent_at: "desc" },
        });

        const minInterval = reminderDays * 24 * 60 * 60 * 1000;
        if (lastReminder) {
          const timeSinceLastReminder = now.getTime() - new Date(lastReminder.sent_at).getTime();
          if (timeSinceLastReminder < minInterval) {
            continue; // Skip, too soon
          }
        }

        // Send reminder email
        await sendEmail({
          to: signer.email,
          templateKey: "vaultsign_reminder",
          variables: {
            sender_name: recruiterName,
            agency_name: orgName,
            document_name: doc.document_name,
            personal_message: doc.personal_message || "",
            expiry_date: new Date(doc.expiry_date).toLocaleDateString(),
            signing_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/sign/${signer.sign_token}`,
          },
        });

        // Create reminder record
        await db.vaultSignReminder.create({
          data: {
            document_id: doc.id,
            signer_id: signer.id,
            reminder_type: "auto",
            sent_at: new Date(),
          },
        });

        remindersSent++;
      }
    }

    return NextResponse.json({ remindersSent });
  } catch (error) {
    console.error("[CRON_VAULTSIGN_REMINDERS]", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}
