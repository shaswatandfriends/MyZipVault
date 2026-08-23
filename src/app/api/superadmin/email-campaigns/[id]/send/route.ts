import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * POST /api/superadmin/email-campaigns/[id]/send
 *   Sends a draft email campaign to all matching users.
 *
 * Behavior:
 *   1. Validates the campaign is in 'draft' status
 *   2. Queries users matching target_role (active, not suspended)
 *   3. Creates EmailCampaignRecipient rows for each (status='pending')
 *   4. Updates campaign status to 'sending' + sets started_at
 *   5. Sends emails via Brevo in batches of 50 (Brevo's batch limit)
 *   6. Updates each recipient's status to 'sent' or 'failed' with error
 *   7. Updates campaign totals (sent_count, failed_count) + status to 'sent' or 'partial_failure'
 *
 * Note: This is a synchronous endpoint — it may take 30+ seconds for large
 * campaigns. Vercel serverless functions have a 60s timeout on Hobby tier,
 * so campaigns larger than ~500 recipients may need to be split. For now,
 * we cap at 500 and report any unsent as 'pending' (admin can retry).
 *
 * Only super_admin can access.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const campaignId = parseInt(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    // ─── Rate limit: max 3 campaign sends per hour ───
    // (each campaign can send up to 500 emails — this prevents Brevo credit drain)
    const adminUserId = Number((session.user as Record<string, unknown>).id);
    const rateLimit = await checkRateLimit("email_campaign_send", `user_${adminUserId}`, 3, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many campaign sends. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // ─── 1. Load campaign ──────────────────────────────────────────────
    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: `Campaign is already in status: ${campaign.status}. Only draft campaigns can be sent.` },
        { status: 400 }
      );
    }

    if (!BREVO_API_KEY) {
      return NextResponse.json(
        { error: "Brevo API key is not configured. Add BREVO_API_KEY in Super Admin API Vault or Vercel env vars." },
        { status: 503 }
      );
    }

    // ─── 2. Find matching users ────────────────────────────────────────
    const targetRole = campaign.target_role;
    const userWhere: Record<string, unknown> = {
      account_status: "active",
      email: { not: "" },
    };

    if (targetRole !== "all") {
      userWhere.role = targetRole;
    }

    // Cap at 500 recipients per send (Vercel 60s timeout protection)
    const MAX_RECIPIENTS_PER_SEND = 500;
    const users = await db.user.findMany({
      where: userWhere,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
      },
      take: MAX_RECIPIENTS_PER_SEND,
    });

    if (users.length === 0) {
      // No recipients — mark as sent with zero counts
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: "sent",
          total_recipients: 0,
          sent_count: 0,
          failed_count: 0,
          started_at: new Date(),
          completed_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Campaign sent — 0 matching recipients found.",
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
      });
    }

    // ─── 3. Create recipient rows (all status='pending') ──────────────
    const recipientData = users.map((u) => ({
      campaign_id: campaignId,
      recipient_user_id: u.id,
      recipient_email: u.email,
      recipient_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || null,
      status: "pending" as const,
    }));

    // Bulk insert recipients (skipping duplicates if any)
    await db.emailCampaignRecipient.createMany({
      data: recipientData,
      skipDuplicates: true,
    });

    // Update campaign status to 'sending' with totals
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: "sending",
        total_recipients: users.length,
        started_at: new Date(),
      },
    });

    // ─── 4. Send emails via Brevo in batches of 50 ─────────────────────
    const BATCH_SIZE = 50;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      // Personalize the body for each recipient (replace {{first_name}}, {{name}}, {{email}})
      const sendPromises = batch.map(async (user) => {
        const recipientName =
          [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

        // Variable replacement — same convention as other emails
        let personalizedBody = campaign.body
          .replace(/\{\{first_name\}\}/g, user.first_name || "")
          .replace(/\{\{last_name\}\}/g, user.last_name || "")
          .replace(/\{\{name\}\}/g, recipientName)
          .replace(/\{\{email\}\}/g, user.email)
          .replace(/\{\{role\}\}/g, user.role);

        let personalizedSubject = campaign.subject
          .replace(/\{\{first_name\}\}/g, user.first_name || "")
          .replace(/\{\{last_name\}\}/g, user.last_name || "")
          .replace(/\{\{name\}\}/g, recipientName)
          .replace(/\{\{email\}\}/g, user.email)
          .replace(/\{\{role\}\}/g, user.role);

        try {
          const brevoResponse = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
              "api-key": BREVO_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: { email: BREVO_SENDER_EMAIL, name: "MyZipVault" },
              to: [{ email: user.email, name: recipientName }],
              subject: personalizedSubject,
              htmlContent: personalizedBody,
              tags: [`campaign:${campaignId}`],
            }),
          });

          if (brevoResponse.ok) {
            const brevoData = await brevoResponse.json();
            const brevoMessageId = brevoData?.messageId || null;

            await db.emailCampaignRecipient.updateMany({
              where: {
                campaign_id: campaignId,
                recipient_user_id: user.id,
              },
              data: {
                status: "sent",
                sent_at: new Date(),
                brevo_message_id: brevoMessageId,
              },
            });
            sentCount++;
          } else {
            const errorText = await brevoResponse.text();
            console.error(`[EMAIL CAMPAIGN ${campaignId}] Brevo API error for ${user.email}:`, errorText);

            await db.emailCampaignRecipient.updateMany({
              where: {
                campaign_id: campaignId,
                recipient_user_id: user.id,
              },
              data: {
                status: "failed",
                error_message: `Brevo API ${brevoResponse.status}: ${errorText.substring(0, 500)}`,
              },
            });
            failedCount++;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          console.error(`[EMAIL CAMPAIGN ${campaignId}] Send error for ${user.email}:`, err);

          await db.emailCampaignRecipient.updateMany({
            where: {
              campaign_id: campaignId,
              recipient_user_id: user.id,
            },
            data: {
              status: "failed",
              error_message: `Network error: ${errorMsg.substring(0, 500)}`,
            },
          });
          failedCount++;
        }
      });

      // Send batch in parallel (Brevo allows concurrent requests within rate limit)
      await Promise.all(sendPromises);
    }

    // ─── 5. Update campaign totals ────────────────────────────────────
    // Status logic:
    //   - failedCount === 0          → "sent" (all delivered)
    //   - sentCount === 0            → "failed" (none delivered)
    //   - both > 0                   → "partial_failure" (some delivered, some not)
    const finalStatus =
      failedCount === 0
        ? "sent"
        : sentCount === 0
        ? "failed"
        : "partial_failure";

    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date(),
      },
    });

    console.log(
      `[EMAIL CAMPAIGN ${campaignId}] Complete — sent: ${sentCount}, failed: ${failedCount}, total: ${users.length}`
    );

    return NextResponse.json({
      success: true,
      message: `Campaign sent — ${sentCount} delivered, ${failedCount} failed.`,
      totalRecipients: users.length,
      sentCount,
      failedCount,
    });
  } catch (error) {
    console.error("[EMAIL CAMPAIGNS] Send error:", error);

    // If we crashed mid-send, mark the campaign with the appropriate
    // status based on what we managed to send (failed if 0 sent,
    // partial_failure otherwise).
    try {
      const { id } = await params;
      const campaignId = parseInt(id);
      if (!isNaN(campaignId)) {
        const sentCount = await db.emailCampaignRecipient.count({
          where: { campaign_id: campaignId, status: "sent" },
        });
        const failedCount = await db.emailCampaignRecipient.count({
          where: { campaign_id: campaignId, status: "failed" },
        });
        const crashStatus = sentCount === 0 ? "failed" : "partial_failure";
        await db.emailCampaign.update({
          where: { id: campaignId },
          data: {
            status: crashStatus,
            sent_count: sentCount,
            failed_count: failedCount,
            completed_at: new Date(),
          },
        });
      }
    } catch (cleanupErr) {
      console.error("[EMAIL CAMPAIGNS] Cleanup error:", cleanupErr);
    }

    return NextResponse.json(
      { error: "Failed to send email campaign" },
      { status: 500 }
    );
  }
}
