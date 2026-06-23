import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  getChecklistReminderConfig,
  SETTING_KEYS,
} from "@/lib/checklist-settings";
import { sendChecklistExpiryReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update credentials with no expiration → active
    const activeResult = await db.credential.updateMany({
      where: {
        expiration_date: null,
        status: { not: "active" },
      },
      data: { status: "active" },
    });

    // Update credentials with expiration_date < now → expired
    const expiredResult = await db.credential.updateMany({
      where: {
        expiration_date: { lt: now },
        status: { not: "expired" },
      },
      data: { status: "expired" },
    });

    // Update credentials with expiration_date within 30 days → expiring_soon
    const expiringResult = await db.credential.updateMany({
      where: {
        expiration_date: { gte: now, lte: thirtyDaysFromNow },
        status: { not: "expiring_soon" },
      },
      data: { status: "expiring_soon" },
    });

    // Update credentials with expiration_date > 30 days → active
    const futureActiveResult = await db.credential.updateMany({
      where: {
        expiration_date: { gt: thirtyDaysFromNow },
        status: { not: "active" },
      },
      data: { status: "active" },
    });

    const credentialsUpdated =
      activeResult.count +
      expiredResult.count +
      expiringResult.count +
      futureActiveResult.count;

    // Update candidate_checklist_responses: if valid_until < now → expired
    const checklistsResult = await db.candidateChecklistResponse.updateMany({
      where: {
        valid_until: { lt: now },
        status: { not: "expired" },
      },
      data: { status: "expired" },
    });

    // ─── NEW: Expire stale checklist requests ────────────────────────
    // Any pending request (sent/opened/in_progress) whose expires_at has
    // passed → mark as "expired". Candidate can no longer complete it;
    // recruiter sees it as expired in their BOB; pipeline-lock no longer
    // blocks new requests for the same candidate.
    const expiredRequestsResult = await db.checklistRequest.updateMany({
      where: {
        status: { in: ["sent", "opened", "in_progress"] },
        expires_at: { lt: now },
      },
      data: { status: "expired" },
    });

    // ─── NEW: Send expiry-reminder notifications ─────────────────────
    // For each pending request whose expires_at is within
    // `reminderDaysBefore` days from now AND hasn't had a reminder sent
    // yet (tracked via the `checklist_reminder_sent` PlatformSetting key
    // scoped per request id), send email + in-app notification.
    let remindersSent = 0;
    const reminderConfig = await getChecklistReminderConfig();

    if (reminderConfig.enabled) {
      const reminderWindowStart = now;
      const reminderWindowEnd = new Date(
        now.getTime() + reminderConfig.daysBefore * 24 * 60 * 60 * 1000
      );

      // Find requests that should receive a reminder now
      const dueForReminder = await db.checklistRequest.findMany({
        where: {
          status: { in: ["sent", "opened", "in_progress"] },
          expires_at: {
            gte: reminderWindowStart,
            lte: reminderWindowEnd,
          },
        },
        include: {
          checklist_template: { select: { name: true, profession: true, specialty: true } },
          candidate_user: { select: { id: true, email: true, first_name: true, last_name: true, phone: true } },
          client_user: { select: { id: true, first_name: true, last_name: true, organization_id: true } },
        },
        take: 200,
      });

      for (const req of dueForReminder) {
        // Dedup: check if we already sent a reminder for this request id
        const dedupKey = `${SETTING_KEYS.reminderEnabled}::sent::${req.id}`;
        const alreadySent = await db.platformSetting.findUnique({
          where: { setting_key: dedupKey },
        });
        if (alreadySent) continue;

        const candidateName =
          [req.candidate_user.first_name, req.candidate_user.last_name]
            .filter(Boolean)
            .join(" ") || "there";
        const recruiterName =
          [req.client_user.first_name, req.client_user.last_name]
            .filter(Boolean)
            .join(" ") || "your recruiter";
        const checklistName =
          req.checklist_template.name ||
          `${req.checklist_template.profession} — ${req.checklist_template.specialty}`;

        // Compute days remaining (rounded up, min 1)
        const msRemaining = req.expires_at!.getTime() - now.getTime();
        const daysRemaining = Math.max(
          1,
          Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
        );

        // Email
        if (reminderConfig.emailEnabled) {
          try {
            await sendChecklistExpiryReminderEmail(
              req.candidate_user.email,
              candidateName,
              checklistName,
              recruiterName,
              String(daysRemaining),
              `${process.env.NEXT_PUBLIC_APP_URL || "https://my-zip-vault.vercel.app"}/checklists`,
              req.candidate_user.phone || undefined
            );
          } catch (e) {
            console.error(`[CRON] Failed to send checklist reminder email for request ${req.id}:`, e);
          }
        }

        // In-app notification
        if (reminderConfig.inAppEnabled) {
          try {
            await db.notification.create({
              data: {
                user_id: req.candidate_user.id,
                title: "Checklist expiring soon",
                message: `Your "${checklistName}" checklist requested by ${recruiterName} expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
                type: "checklist_reminder",
                related_entity_id: req.id,
                related_entity_type: "checklist_request",
                metadata: JSON.stringify({
                  request_id: req.id,
                  expires_at: req.expires_at,
                  checklist_name: checklistName,
                }),
              },
            });
          } catch (e) {
            console.error(`[CRON] Failed to create in-app checklist reminder for request ${req.id}:`, e);
          }
        }

        // SMS — architecture-only stub (no provider wired). Log intent.
        if (reminderConfig.smsEnabled) {
          console.log(
            `[CRON] SMS reminder queued (no provider) for request ${req.id} → candidate ${req.candidate_user.id}`
          );
        }

        // Mark as sent (dedup marker — persists for 30 days then cleaned up)
        await db.platformSetting.upsert({
          where: { setting_key: dedupKey },
          create: {
            setting_key: dedupKey,
            setting_value: new Date().toISOString(),
          },
          update: {
            setting_value: new Date().toISOString(),
          },
        });

        remindersSent++;
      }

      // Clean up dedup markers older than 30 days (housekeeping)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      await db.platformSetting.deleteMany({
        where: {
          setting_key: { startsWith: `${SETTING_KEYS.reminderEnabled}::sent::` },
          updated_at: { lt: thirtyDaysAgo },
        },
      });
    }

    return NextResponse.json({
      credentials_updated: credentialsUpdated,
      checklists_updated: checklistsResult.count,
      checklist_requests_expired: expiredRequestsResult.count,
      checklist_reminders_sent: remindersSent,
    });
  } catch (error) {
    console.error("[CRON_STATUS_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update statuses" },
      { status: 500 }
    );
  }
}
