import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/newsletter/subscribe
 *
 * Captures an email address from the landing page newsletter signup form.
 * Stores in PlatformSetting with key `newsletter_<email>` and metadata
 * (UTM params, timestamp) for marketing attribution.
 *
 * Does NOT create a User account — this is a pre-signup lead capture.
 * The user can later sign up for a full account.
 *
 * Body:
 *   - email: string (required)
 *   - utm_source, utm_medium, utm_campaign, utm_term, utm_content: string (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "").toString().trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await db.platformSetting.findUnique({
      where: { setting_key: `newsletter_${email}` },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already subscribed! Check your inbox for the salary report.",
        already_subscribed: true,
      });
    }

    // Store the subscription with metadata
    const metadata = {
      email,
      subscribed_at: new Date().toISOString(),
      utm: {
        source: body.utm_source || "direct",
        medium: body.utm_medium || "",
        campaign: body.utm_campaign || "",
        term: body.utm_term || "",
        content: body.utm_content || "",
      },
      // Flag to send the lead magnet email
      lead_magnet_sent: false,
    };

    await db.platformSetting.upsert({
      where: { setting_key: `newsletter_${email}` },
      update: { setting_value: JSON.stringify(metadata) },
      create: {
        setting_key: `newsletter_${email}`,
        setting_value: JSON.stringify(metadata),
      },
    });

    // TODO: Send the lead magnet email (salary report) via Brevo
    // For now, just log it — the superadmin can manually send later
    console.log(`[NEWSLETTER] New subscription: ${email} (source: ${metadata.utm.source})`);

    return NextResponse.json({
      success: true,
      message: "Subscribed successfully! Check your inbox for the salary report.",
    });
  } catch (error) {
    console.error("[NEWSLETTER API] Error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
