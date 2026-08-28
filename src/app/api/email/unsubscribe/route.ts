import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/email/unsubscribe?token=<tracking_token>
 *   Looks up the recipient by tracking token and returns their masked email.
 *   Used by the /unsubscribe page to show the user which email will be
 *   unsubscribed.
 *
 * POST /api/email/unsubscribe?token=<tracking_token>
 *   Confirms the unsubscribe — adds the recipient's email to the
 *   EmailUnsubscribe suppression list and marks the recipient as
 *   'unsubscribed' status.
 *
 * Both endpoints are PUBLIC (no auth) — the tracking token serves as
 * the authorization. The token is a per-recipient UUID that's
 * unguessable.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // token can come from URL params or query string
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || (await params).token;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const recipient = await db.emailCampaignRecipient.findFirst({
      where: { tracking_token: token },
      select: { recipient_email: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
    }

    return NextResponse.json({ email: recipient.recipient_email });
  } catch (error) {
    console.error("[UNSUBSCRIBE_GET]", error);
    return NextResponse.json({ error: "Failed to look up recipient" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || (await params).token;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Find the recipient
    const recipient = await db.emailCampaignRecipient.findFirst({
      where: { tracking_token: token },
      select: { id: true, recipient_email: true, campaign_id: true, status: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
    }

    // Check if already unsubscribed
    const existing = await db.emailUnsubscribe.findUnique({
      where: { email: recipient.recipient_email },
    });

    if (existing) {
      // Already unsubscribed — return success (idempotent)
      return NextResponse.json({ success: true, message: "Already unsubscribed" });
    }

    // Add to suppression list + update recipient status (in a transaction)
    await db.$transaction(async (tx) => {
      // Add to suppression list
      await tx.emailUnsubscribe.create({
        data: {
          email: recipient.recipient_email,
          source: "manual",
          source_campaign_id: recipient.campaign_id,
        },
      });

      // Update recipient status
      await tx.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "unsubscribed" },
      });
    });

    return NextResponse.json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    // If it's a unique constraint violation (P2002), the email is already
    // in the suppression list — treat as success (idempotent)
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ success: true, message: "Already unsubscribed" });
    }
    console.error("[UNSUBSCRIBE_POST]", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
