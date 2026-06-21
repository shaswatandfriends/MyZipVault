import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/**
 * GET /api/cron/credential-expiry
 *
 * Daily cron that checks credential expiration_date and sends notifications:
 *
 * 1. EXPIRING SOON (within 30 days, not yet expired)
 *    - Notify candidate (important): "Your {doc} expires on {date}. Please renew."
 *    - Notify owning recruiter (important): "{candidate}'s {doc} expires on {date}."
 *
 * 2. EXPIRED (expiration_date has passed)
 *    - Notify candidate (urgent): "Your {doc} expired on {date}. Please renew."
 *    - Notify owning recruiter (important): "{candidate}'s {doc} expired on {date}."
 *
 * Ownership: For each credential, we look up the RecruiterLead whose
 * candidate_user_id matches the credential's owner. If multiple recruiters
 * own the same candidate (rare), all of them are notified.
 *
 * Schedule: Daily at 5:00 AM UTC (recommended)
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://my-zip-vault.vercel.app/api/cron/credential-expiry
 *
 * Security: Protected by CRON_SECRET (same as all cron endpoints)
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    console.log("[CRED_EXPIRY CRON] Starting daily credential expiry checks...");
    const startTime = Date.now();

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── 1. EXPIRING SOON (within 30 days, not yet expired) ──
    const expiringSoon = await db.credential.findMany({
      where: {
        expiration_date: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        status: "active",
      },
      include: {
        candidate_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    console.log(`[CRED_EXPIRY CRON] Found ${expiringSoon.length} credential(s) expiring soon`);

    let expiringSoonCandidateNotified = 0;
    let expiringSoonRecruiterNotified = 0;

    for (const cred of expiringSoon) {
      const dateStr = cred.expiration_date
        ? cred.expiration_date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "soon";

      const candidateName =
        `${cred.candidate_user.first_name ?? ""} ${cred.candidate_user.last_name ?? ""}`.trim() ||
        "Candidate";

      // Notify candidate (important)
      try {
        const { createNotification } = await import("@/lib/notifications/create");
        await createNotification({
          userId: cred.candidate_user_id,
          category: "document",
          priority: "important",
          title: "Credential expiring soon ⏳",
          message: `Your ${cred.document_name} expires on ${dateStr}. Please renew.`,
          actionUrl: "/vault/credentials",
          actionLabel: "Renew now",
          relatedEntityId: cred.id,
          relatedEntityType: "credential",
        });
        expiringSoonCandidateNotified++;
      } catch (err) {
        console.error(
          `[CRED_EXPIRY CRON] Failed to notify candidate ${cred.candidate_user_id}:`,
          err
        );
      }

      // Notify owning recruiter(s)
      try {
        const owningLeads = await db.recruiterLead.findMany({
          where: { candidate_user_id: cred.candidate_user_id, is_active: true },
          select: { id: true, recruiter_user_id: true },
        });

        if (owningLeads.length > 0) {
          const { createNotification } = await import("@/lib/notifications/create");
          for (const lead of owningLeads) {
            try {
              await createNotification({
                userId: lead.recruiter_user_id,
                category: "document",
                priority: "important",
                title: "Candidate credential expiring soon ⏳",
                message: `${candidateName}'s ${cred.document_name} expires on ${dateStr}.`,
                actionUrl: `/recruiter/candidates/${lead.id}`,
                actionLabel: "View candidate",
                relatedEntityId: cred.id,
                relatedEntityType: "credential",
              });
              expiringSoonRecruiterNotified++;
            } catch (leadErr) {
              console.error(
                `[CRED_EXPIRY CRON] Failed to notify recruiter ${lead.recruiter_user_id}:`,
                leadErr
              );
            }
          }
        }
      } catch (err) {
        console.error(
          `[CRED_EXPIRY CRON] Failed to look up owning recruiter for credential ${cred.id}:`,
          err
        );
      }
    }

    // ── 2. EXPIRED (expiration_date has passed) ──
    const expired = await db.credential.findMany({
      where: {
        expiration_date: {
          lt: now,
        },
        status: "active",
      },
      include: {
        candidate_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    console.log(`[CRED_EXPIRY CRON] Found ${expired.length} expired credential(s)`);

    let expiredCandidateNotified = 0;
    let expiredRecruiterNotified = 0;

    for (const cred of expired) {
      const dateStr = cred.expiration_date
        ? cred.expiration_date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "recently";

      const candidateName =
        `${cred.candidate_user.first_name ?? ""} ${cred.candidate_user.last_name ?? ""}`.trim() ||
        "Candidate";

      // Notify candidate (urgent)
      try {
        const { createNotification } = await import("@/lib/notifications/create");
        await createNotification({
          userId: cred.candidate_user_id,
          category: "document",
          priority: "urgent",
          title: "Credential expired 🚨",
          message: `Your ${cred.document_name} expired on ${dateStr}. Please renew.`,
          actionUrl: "/vault/credentials",
          actionLabel: "Renew now",
          relatedEntityId: cred.id,
          relatedEntityType: "credential",
        });
        expiredCandidateNotified++;
      } catch (err) {
        console.error(
          `[CRED_EXPIRY CRON] Failed to notify candidate ${cred.candidate_user_id}:`,
          err
        );
      }

      // Notify owning recruiter(s)
      try {
        const owningLeads = await db.recruiterLead.findMany({
          where: { candidate_user_id: cred.candidate_user_id, is_active: true },
          select: { id: true, recruiter_user_id: true },
        });

        if (owningLeads.length > 0) {
          const { createNotification } = await import("@/lib/notifications/create");
          for (const lead of owningLeads) {
            try {
              await createNotification({
                userId: lead.recruiter_user_id,
                category: "document",
                priority: "important",
                title: "Candidate credential expired 🚨",
                message: `${candidateName}'s ${cred.document_name} expired on ${dateStr}.`,
                actionUrl: `/recruiter/candidates/${lead.id}`,
                actionLabel: "View candidate",
                relatedEntityId: cred.id,
                relatedEntityType: "credential",
              });
              expiredRecruiterNotified++;
            } catch (leadErr) {
              console.error(
                `[CRED_EXPIRY CRON] Failed to notify recruiter ${lead.recruiter_user_id}:`,
                leadErr
              );
            }
          }
        }
      } catch (err) {
        console.error(
          `[CRED_EXPIRY CRON] Failed to look up owning recruiter for credential ${cred.id}:`,
          err
        );
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[CRED_EXPIRY CRON] Done in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      expiring_soon: {
        count: expiringSoon.length,
        candidate_notified: expiringSoonCandidateNotified,
        recruiter_notified: expiringSoonRecruiterNotified,
      },
      expired: {
        count: expired.length,
        candidate_notified: expiredCandidateNotified,
        recruiter_notified: expiredRecruiterNotified,
      },
      duration_ms: elapsed,
      checked_at: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[CRED_EXPIRY CRON] Error:", error);
    return NextResponse.json(
      { error: error.message || "Credential expiry cron failed" },
      { status: 500 }
    );
  }
}
