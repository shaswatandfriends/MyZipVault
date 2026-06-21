import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/**
 * GET /api/cron/org-checks
 *
 * Daily cron that runs organization-level compliance/credit checks:
 *
 * 1. BAA EXPIRY
 *    - Find orgs where baa_status = "signed" AND baa_signed_at is more than
 *      11 months ago (i.e., BAA will expire within the next month)
 *    - Notify the org admin (important)
 *    - Title: "BAA expiring soon", actionUrl: "/recruiter/baa",
 *      actionLabel: "Renew BAA"
 *
 * 2. CREDITS BELOW THRESHOLD
 *    - Find orgs where credits_balance < 10
 *    - Notify the org admin (urgent)
 *    - Title: "Credits critically low", actionUrl: "/recruiter/billing",
 *      actionLabel: "Purchase credits"
 *
 * Schedule: Daily at 6:00 AM UTC (recommended)
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://my-zip-vault.vercel.app/api/cron/org-checks
 *
 * Security: Protected by CRON_SECRET (same as all cron endpoints)
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    console.log("[ORG_CHECKS CRON] Starting daily organization checks...");
    const startTime = Date.now();

    const now = new Date();
    const elevenMonthsAgo = new Date(
      now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000
    );

    // ── 1. BAA EXPIRY ──
    // Find orgs where BAA was signed more than 11 months ago and is still "signed"
    const orgsBaaExpiring = await db.organization.findMany({
      where: {
        baa_status: "signed",
        baa_signed_at: { lt: elevenMonthsAgo },
      },
      select: { id: true, name: true },
    });

    console.log(
      `[ORG_CHECKS CRON] Found ${orgsBaaExpiring.length} org(s) with BAA expiring soon`
    );

    let baaNotified = 0;
    for (const org of orgsBaaExpiring) {
      try {
        const admin = await db.user.findFirst({
          where: { organization_id: org.id, role: "client_admin" },
          select: { id: true },
        });

        if (admin) {
          const { createNotification } = await import("@/lib/notifications/create");
          await createNotification({
            userId: admin.id,
            category: "compliance",
            priority: "important",
            title: "BAA expiring soon 📄",
            message: `Your organization's BAA was signed over 11 months ago and will expire soon. Please renew to maintain HIPAA compliance.`,
            actionUrl: "/recruiter/baa",
            actionLabel: "Renew BAA",
            relatedEntityId: org.id,
            relatedEntityType: "organization",
          });
          baaNotified++;
        }
      } catch (err) {
        console.error(
          `[ORG_CHECKS CRON] Failed to notify org ${org.id} about BAA expiry:`,
          err
        );
      }
    }

    // ── 2. CREDITS BELOW THRESHOLD ──
    const orgsLowCredits = await db.organization.findMany({
      where: {
        credits_balance: { lt: 10 },
      },
      select: { id: true, name: true, credits_balance: true },
    });

    console.log(
      `[ORG_CHECKS CRON] Found ${orgsLowCredits.length} org(s) with critically low credits`
    );

    let creditsNotified = 0;
    for (const org of orgsLowCredits) {
      try {
        const admin = await db.user.findFirst({
          where: { organization_id: org.id, role: "client_admin" },
          select: { id: true },
        });

        if (admin) {
          const { createNotification } = await import("@/lib/notifications/create");
          await createNotification({
            userId: admin.id,
            category: "credit",
            priority: "urgent",
            title: "Credits critically low 🚨",
            message: `Your organization has only ${org.credits_balance} credits remaining. Purchase more to avoid disruption to your recruiting workflow.`,
            actionUrl: "/recruiter/billing",
            actionLabel: "Purchase credits",
            relatedEntityId: org.id,
            relatedEntityType: "organization",
          });
          creditsNotified++;
        }
      } catch (err) {
        console.error(
          `[ORG_CHECKS CRON] Failed to notify org ${org.id} about low credits:`,
          err
        );
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ORG_CHECKS CRON] Done in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      baa_expiry: {
        orgs_found: orgsBaaExpiring.length,
        admins_notified: baaNotified,
      },
      low_credits: {
        orgs_found: orgsLowCredits.length,
        admins_notified: creditsNotified,
      },
      duration_ms: elapsed,
      checked_at: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[ORG_CHECKS CRON] Error:", error);
    return NextResponse.json(
      { error: error.message || "Org checks cron failed" },
      { status: 500 }
    );
  }
}
