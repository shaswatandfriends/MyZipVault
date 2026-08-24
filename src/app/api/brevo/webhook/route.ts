import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/brevo/webhook
 *
 * Brevo (Sendinblue) webhook receiver for email campaign tracking events.
 *
 * Brevo sends webhook events for:
 *   - delivered     → email was delivered to the recipient's server
 *   - opened        → email was opened (tracking pixel fired OR Brevo's own tracking)
 *   - clicked       → a link in the email was clicked
 *   - softBounce    → temporary delivery failure
 *   - hardBounce    → permanent delivery failure
 *   - complained    → recipient marked as spam
 *   - unsubscribed  → recipient clicked unsubscribe
 *
 * Each event includes:
 *   - event: the event type
 *   - email: recipient email
 *   - messageId: Brevo's message ID (matches EmailCampaignRecipient.brevo_message_id)
 *   - campaignId (in tags): the campaign ID (from the `campaign:${id}` tag)
 *   - date: timestamp of the event
 *   - link: (for click events) the URL that was clicked
 *   - reason: (for bounce events) the bounce reason
 *
 * Auth: Verified via BREVO_WEBHOOK_SECRET env var (shared secret in the
 * webhook URL query param or header). If the secret is not set, the
 * endpoint accepts all requests (for initial setup/testing). Once
 * deployed, set BREVO_WEBHOOK_SECRET in Vercel and configure the
 * webhook URL in Brevo as:
 *   https://myzipvault.com/api/brevo/webhook?secret=<BREVO_WEBHOOK_SECRET>
 *
 * Idempotent — uses "update only if null" pattern for opened_at / clicked_at /
 * delivered_at so webhook retries don't overwrite the first event timestamp.
 */
export async function POST(request: Request) {
  try {
    // ── Optional auth: verify shared secret ──
    const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
    if (webhookSecret) {
      const url = new URL(request.url);
      const providedSecret = url.searchParams.get("secret") ||
        request.headers.get("x-brevo-webhook-secret");
      if (providedSecret !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Brevo sends events as an array (batch) or a single object
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const eventType = event.event as string;
      const messageId = event.messageId as string | undefined;
      const email = event.email as string | undefined;
      const eventDate = event.date ? new Date(event.date) : new Date();
      const reason = event.reason as string | undefined;
      const link = event.link as string | undefined;

      if (!messageId && !email) {
        // Can't correlate — skip
        continue;
      }

      // Find the recipient by brevo_message_id (preferred) or by email
      const whereClause: Record<string, unknown> = {};
      if (messageId) {
        whereClause.brevo_message_id = messageId;
      } else if (email) {
        // Fallback: find by email (less precise — might match multiple
        // campaigns if the same email was in multiple campaigns)
        whereClause.recipient_email = email;
      }

      const recipient = await db.emailCampaignRecipient.findFirst({
        where: whereClause,
        select: { id: true, status: true, opened_at: true, clicked_at: true, delivered_at: true },
      });

      if (!recipient) {
        // Recipient not found — may have been deleted. Skip silently.
        continue;
      }

      // Process based on event type
      const updateData: Record<string, unknown> = {};

      switch (eventType) {
        case "delivered":
          if (!recipient.delivered_at) {
            updateData.delivered_at = eventDate;
          }
          if (recipient.status === "sent") {
            // Keep status as 'sent' — delivered is a refinement
          }
          break;

        case "opened":
        case "uniqueOpened":
          if (!recipient.opened_at) {
            updateData.opened_at = eventDate;
          }
          break;

        case "clicked":
          if (!recipient.clicked_at) {
            updateData.clicked_at = eventDate;
          }
          // Also set opened_at if not already (a click implies an open)
          if (!recipient.opened_at) {
            updateData.opened_at = eventDate;
          }
          break;

        case "softBounce":
          // Soft bounce — don't change status, just log the error
          // (the email may succeed on retry)
          break;

        case "hardBounce":
          updateData.status = "bounced";
          if (reason) {
            updateData.error_message = `Hard bounce: ${reason}`.substring(0, 500);
          }
          // Add to suppression list (hard bounces should not be re-sent)
          if (email) {
            try {
              await db.emailUnsubscribe.upsert({
                where: { email },
                create: { email, source: "brevo", source_campaign_id: undefined },
                update: {},
              });
            } catch { /* unique constraint = already exists, fine */ }
          }
          break;

        case "complained":
          updateData.status = "complained";
          if (reason) {
            updateData.error_message = `Spam complaint: ${reason}`.substring(0, 500);
          }
          // Add to suppression list (complaints should not be re-sent)
          if (email) {
            try {
              await db.emailUnsubscribe.upsert({
                where: { email },
                create: { email, source: "brevo", source_campaign_id: undefined },
                update: {},
              });
            } catch { /* unique constraint = already exists, fine */ }
          }
          break;

        case "unsubscribed":
        case "unsubscribe":
          updateData.status = "unsubscribed";
          // Add to suppression list
          if (email) {
            try {
              await db.emailUnsubscribe.upsert({
                where: { email },
                create: { email, source: "brevo", source_campaign_id: undefined },
                update: {},
              });
            } catch { /* unique constraint = already exists, fine */ }
          }
          break;

        default:
          // Unknown event type — skip
          continue;
      }

      // Update the recipient if there are changes
      if (Object.keys(updateData).length > 0) {
        await db.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: updateData,
        });
      }
    }

    return NextResponse.json({ received: true, processed: events.length });
  } catch (error) {
    console.error("[BREVO_WEBHOOK]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
