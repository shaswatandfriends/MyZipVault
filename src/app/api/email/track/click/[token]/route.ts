import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/email/track/click/[token]?u=<url>
 *
 * Click redirect endpoint — when a recipient clicks a link in a
 * campaign email, they hit this URL first. We record the click
 * event (update `EmailCampaignRecipient.clicked_at`) and then
 * 302-redirect them to the original URL.
 *
 * This endpoint is PUBLIC (no auth) — email links don't have a session.
 *
 * The `u` query param contains the original URL (URL-encoded).
 * At send time, all <a href="..."> links in the email body are
 * rewritten to:
 *   https://myzipvault.com/api/email/track/click/{token}?u={encoded-original-url}
 *
 * Idempotent — if clicked_at is already set, we still redirect but
 * don't overwrite the timestamp (first click is canonical).
 *
 * Security:
 *   - Only redirect to http:// or https:// URLs (no javascript:, mailto:, etc.)
 *   - The `u` param is validated before redirecting
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("u");

    // Validate the target URL — only allow http/https
    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      // Invalid or missing URL — redirect to homepage as fallback
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Fire-and-forget: update clicked_at if not already set
    db.emailCampaignRecipient.updateMany({
      where: {
        tracking_token: token,
        clicked_at: null,
      },
      data: { clicked_at: new Date() },
    }).catch((err) => {
      console.error("[EMAIL_TRACK_CLICK]", err);
    });

    // 302 redirect to the original URL
    return NextResponse.redirect(targetUrl);
  } catch {
    // On any error, redirect to homepage
    return NextResponse.redirect(new URL("/", request.url));
  }
}
