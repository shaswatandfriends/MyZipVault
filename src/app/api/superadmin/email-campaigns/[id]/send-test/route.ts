import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCampaignEmailHtml } from "@/lib/campaign-email";

/**
 * POST /api/superadmin/email-campaigns/[id]/send-test
 *
 * Sends a test email of the campaign to the admin's own email address.
 * This lets the admin preview how the branded email will look before
 * sending to all recipients.
 *
 * The test email:
 *   - Uses the campaign's body (with variable substitution using sample data)
 *   - Wraps with the branded template (logo, accent bar, footer)
 *   - Does NOT inject tracking pixels (it's a test, not a real send)
 *   - Does NOT create EmailCampaignRecipient rows
 *   - Does NOT modify the campaign status
 *
 * Auth: super_admin only.
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

    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
      select: {
        name: true,
        subject: true,
        body: true,
        from_name: true,
        reply_to: true,
        logo_url: true,
        accent_color: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const adminEmail = session.user.email;
    if (!adminEmail) {
      return NextResponse.json({ error: "No email on session" }, { status: 400 });
    }

    // Personalize with sample data
    const sampleFirstName = "Test";
    const sampleLastName = "User";
    const sampleName = "Test User";

    let testBody = campaign.body
      .replace(/\{\{first_name\}\}/g, sampleFirstName)
      .replace(/\{\{last_name\}\}/g, sampleLastName)
      .replace(/\{\{name\}\}/g, sampleName)
      .replace(/\{\{email\}\}/g, adminEmail)
      .replace(/\{\{role\}\}/g, "test");

    let testSubject = campaign.subject
      .replace(/\{\{first_name\}\}/g, sampleFirstName)
      .replace(/\{\{last_name\}\}/g, sampleLastName)
      .replace(/\{\{name\}\}/g, sampleName)
      .replace(/\{\{email\}\}/g, adminEmail)
      .replace(/\{\{role\}\}/g, "test");

    // Add a "TEST EMAIL" banner at the top
    testBody = `<div style="background:#fef3c7; border:1px solid #f59e0b; border-radius:8px; padding:12px 16px; margin-bottom:20px; text-align:center; font-size:13px; color:#92400e;">🧪 <strong>TEST EMAIL</strong> — This is a preview. Real sends will not have this banner.</div>${testBody}`;

    // Wrap with branded template (no tracking pixel, no unsubscribe for test)
    const brandedHtml = buildCampaignEmailHtml(testBody, {
      accentColor: campaign.accent_color || "#0A66C2",
      logoUrl: campaign.logo_url || undefined,
      campaignName: campaign.name + " (TEST)",
    });

    // Send via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
    const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    if (!BREVO_API_KEY) {
      return NextResponse.json(
        { error: "Brevo is not configured. Set BREVO_API_KEY env var." },
        { status: 503 }
      );
    }

    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: campaign.from_name || "MyZipVault" },
        to: [{ email: adminEmail, name: "Super Admin" }],
        subject: `[TEST] ${testSubject}`,
        htmlContent: brandedHtml,
        tags: [`campaign-test:${campaignId}`],
        ...(campaign.reply_to ? { replyTo: { email: campaign.reply_to } } : {}),
      }),
    });

    if (brevoResponse.ok) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${adminEmail}`,
      });
    } else {
      const error = await brevoResponse.text();
      return NextResponse.json(
        { error: `Brevo error: ${error}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[CAMPAIGN_SEND_TEST]", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
