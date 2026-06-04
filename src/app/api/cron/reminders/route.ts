import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    let generated = 0;

    // Find all active automated rules
    const activeRules = await db.automatedRule.findMany({
      where: { is_active: true },
    });

    for (const rule of activeRules) {
      if (rule.rule_name === "reference_reminder_3_day") {
        // Find candidate_references with status = "pending_request" where requested_at is 3+ days ago
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const pendingRefs = await db.candidateReference.findMany({
          where: {
            status: "pending_request",
            requested_at: { lte: threeDaysAgo },
          },
        });

        for (const ref of pendingRefs) {
          // Check for duplicates
          const existing = await db.pendingReminder.findFirst({
            where: {
              rule_id: rule.id,
              target_user_id: ref.candidate_user_id,
              status: "awaiting_approval",
            },
          });

          if (!existing) {
            await db.pendingReminder.create({
              data: {
                rule_id: rule.id,
                target_user_id: ref.candidate_user_id,
                message_preview: `Reference request to ${ref.manager_email} at ${ref.facility_name} has been pending for 3+ days`,
                status: "awaiting_approval",
              },
            });
            generated++;
          }
        }
      }

      if (rule.rule_name === "credential_expiry_30_day") {
        // Find credentials where reminder_enabled = true AND expiration_date is within 30 days
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringCreds = await db.credential.findMany({
          where: {
            reminder_enabled: true,
            expiration_date: {
              gte: now,
              lte: thirtyDaysFromNow,
            },
            status: { not: "expired" },
          },
        });

        for (const cred of expiringCreds) {
          // Check for duplicates
          const existing = await db.pendingReminder.findFirst({
            where: {
              rule_id: rule.id,
              target_user_id: cred.candidate_user_id,
              status: "awaiting_approval",
            },
          });

          if (!existing) {
            await db.pendingReminder.create({
              data: {
                rule_id: rule.id,
                target_user_id: cred.candidate_user_id,
                message_preview: `Credential "${cred.document_name}" expires within 30 days`,
                status: "awaiting_approval",
              },
            });
            generated++;
          }
        }
      }
    }

    return NextResponse.json({ generated });
  } catch (error) {
    console.error("[CRON_REMINDERS]", error);
    return NextResponse.json(
      { error: "Failed to generate reminders" },
      { status: 500 }
    );
  }
}
