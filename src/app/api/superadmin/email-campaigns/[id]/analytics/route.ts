import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/email-campaigns/[id]/analytics
 *
 * Returns real-time analytics for a campaign:
 *   - Summary: total sent, delivered, opened, clicked, bounced, complained, unsubscribed
 *   - Rates: open rate %, click rate %, bounce rate %
 *   - Funnel: sent → delivered → opened → clicked
 *   - Per-recipient timeline: first 100 recipients with their event timestamps
 *
 * Auth: super_admin only.
 */
export async function GET(
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
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    // Get campaign basic info
    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        status: true,
        total_recipients: true,
        sent_count: true,
        failed_count: true,
        started_at: true,
        completed_at: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Aggregate recipient stats
    const recipients = await db.emailCampaignRecipient.findMany({
      where: { campaign_id: campaignId },
      select: {
        id: true,
        recipient_email: true,
        recipient_name: true,
        status: true,
        sent_at: true,
        delivered_at: true,
        opened_at: true,
        clicked_at: true,
        error_message: true,
      },
      orderBy: { sent_at: "desc" },
      take: 100, // First 100 for the timeline table
    });

    // Calculate aggregates
    const total = recipients.length > 0 ? campaign.total_recipients : 0;
    const sent = recipients.filter((r) => r.status === "sent" || r.sent_at).length;
    const delivered = recipients.filter((r) => r.delivered_at).length;
    const opened = recipients.filter((r) => r.opened_at).length;
    const clicked = recipients.filter((r) => r.clicked_at).length;
    const bounced = recipients.filter((r) => r.status === "bounced").length;
    const failed = recipients.filter((r) => r.status === "failed").length;
    const complained = recipients.filter((r) => r.status === "complained").length;
    const unsubscribed = recipients.filter((r) => r.status === "unsubscribed").length;

    // Get full counts (not just first 100) via aggregate queries
    const [fullCounts] = await Promise.all([
      db.emailCampaignRecipient.groupBy({
        by: ["status"],
        where: { campaign_id: campaignId },
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    fullCounts.forEach((s) => {
      statusCounts[s.status] = s._count.status;
    });

    // Open/click counts from all recipients (not just first 100)
    const openCount = await db.emailCampaignRecipient.count({
      where: { campaign_id: campaignId, opened_at: { not: null } },
    });
    const clickCount = await db.emailCampaignRecipient.count({
      where: { campaign_id: campaignId, clicked_at: { not: null } },
    });
    const deliveredCount = await db.emailCampaignRecipient.count({
      where: { campaign_id: campaignId, delivered_at: { not: null } },
    });
    const bouncedCount = statusCounts["bounced"] || 0;
    const complainedCount = statusCounts["complained"] || 0;
    const unsubscribedCount = statusCounts["unsubscribed"] || 0;
    const failedCount = statusCounts["failed"] || 0;
    const sentCount = statusCounts["sent"] || 0;

    const totalRecipients = campaign.total_recipients;
    const totalSent = sentCount;
    const totalDelivered = deliveredCount;
    const totalOpened = openCount;
    const totalClicked = clickCount;

    // Rates
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0;
    const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 1000) / 10 : 0;
    const bounceRate = totalSent > 0 ? Math.round((bouncedCount / totalSent) * 1000) / 10 : 0;
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 1000) / 10 : 0;

    // ─── "Who joined" funnel ──────────────────────────────────────
    // Count recipients who:
    //   - Were already platform users (recipient_user_id IS NOT NULL)
    //   - Opened but haven't logged in since (engaged, not active)
    //   - Opened AND clicked (highly engaged)
    //
    // Also count NEW signups after the campaign started — users whose
    // email matches a campaign recipient AND who signed up after
    // campaign.started_at.
    let newSignupsAfterCampaign = 0;
    let openedButNotActive = 0;
    let openedAndClicked = 0;

    if (campaign.started_at) {
      try {
        // Get all recipient emails for this campaign
        const allRecipientEmails = await db.emailCampaignRecipient.findMany({
          where: { campaign_id: campaignId },
          select: { recipient_email: true, opened_at: true, clicked_at: true, recipient_user_id: true },
        });

        const emails = allRecipientEmails.map((r) => r.recipient_email);

        // Find users who signed up AFTER the campaign started (by email match)
        const newUsers = await db.user.findMany({
          where: {
            email: { in: emails },
            created_at: { gte: campaign.started_at },
          },
          select: { email: true, created_at: true, last_activity_at: true },
        });
        newSignupsAfterCampaign = newUsers.length;

        // Count opened but not active (opened_at set, but last_activity_at is before campaign)
        const openedEmails = allRecipientEmails
          .filter((r) => r.opened_at && !r.recipient_user_id)
          .map((r) => r.recipient_email);
        openedButNotActive = openedEmails.length;

        // Count opened AND clicked (highly engaged)
        openedAndClicked = allRecipientEmails.filter(
          (r) => r.opened_at && r.clicked_at
        ).length;
      } catch (funnelErr) {
        console.error("[CAMPAIGN_ANALYTICS] Funnel query failed:", funnelErr);
        // Non-critical — return zeros
      }
    }

    // Conversion rate: new signups / total sent
    const conversionRate = totalSent > 0 ? Math.round((newSignupsAfterCampaign / totalSent) * 1000) / 10 : 0;

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        started_at: campaign.started_at,
        completed_at: campaign.completed_at,
      },
      summary: {
        total_recipients: totalRecipients,
        sent: totalSent,
        delivered: totalDelivered,
        opened: totalOpened,
        clicked: totalClicked,
        bounced: bouncedCount,
        failed: failedCount,
        complained: complainedCount,
        unsubscribed: unsubscribedCount,
      },
      rates: {
        open_rate: openRate,       // percentage (e.g., 45.2)
        click_rate: clickRate,     // percentage
        bounce_rate: bounceRate,   // percentage
        delivery_rate: deliveryRate, // percentage
        conversion_rate: conversionRate, // new signups / sent
      },
      funnel: {
        sent: totalSent,
        delivered: totalDelivered,
        opened: totalOpened,
        clicked: totalClicked,
      },
      conversion: {
        new_signups: newSignupsAfterCampaign,
        opened_but_not_active: openedButNotActive,
        opened_and_clicked: openedAndClicked,
        conversion_rate: conversionRate,
      },
      recipients: recipients.map((r) => ({
        id: r.id,
        email: r.recipient_email,
        name: r.recipient_name,
        status: r.status,
        sent_at: r.sent_at,
        delivered_at: r.delivered_at,
        opened_at: r.opened_at,
        clicked_at: r.clicked_at,
        error: r.error_message,
      })),
    });
  } catch (error) {
    console.error("[CAMPAIGN_ANALYTICS]", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
