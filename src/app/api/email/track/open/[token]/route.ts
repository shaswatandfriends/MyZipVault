import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/email/track/open/[token]
 *
 * Tracking pixel endpoint — returns a 1×1 transparent GIF.
 * When an email client loads this image, we record the open event
 * by updating `EmailCampaignRecipient.opened_at`.
 *
 * This endpoint is PUBLIC (no auth) — it's loaded by email clients
 * (Gmail, Outlook, Apple Mail) which don't have a session.
 *
 * The token is a per-recipient UUID generated at send time and
 * injected into the email HTML as a tracking pixel:
 *   <img src="https://myzipvault.com/api/email/track/open/{token}" width="1" height="1" alt="">
 *
 * Idempotent — if opened_at is already set, the pixel still returns
 * the GIF but doesn't overwrite the timestamp (first open is the
 * canonical one).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Fire-and-forget: update opened_at if not already set.
    // Don't block the response — the GIF should return instantly.
    db.emailCampaignRecipient.updateMany({
      where: {
        tracking_token: token,
        opened_at: null,
      },
      data: { opened_at: new Date() },
    }).catch((err) => {
      console.error("[EMAIL_TRACK_OPEN]", err);
    });

    // 1×1 transparent GIF (43 bytes, base64-encoded)
    // This is the smallest valid GIF that all email clients accept.
    const gifBase64 =
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const gifBuffer = Buffer.from(gifBase64, "base64");

    return new NextResponse(gifBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(gifBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch {
    // Even on error, return the GIF so the email doesn't show a broken image
    const gifBase64 =
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const gifBuffer = Buffer.from(gifBase64, "base64");
    return new NextResponse(gifBuffer, {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
  }
}
