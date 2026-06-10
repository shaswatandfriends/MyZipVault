import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  LANDING_PAGE_CONFIG_KEY,
  DEFAULT_LANDING_PAGE_CONFIG,
  mergeWithDefaults,
} from "@/lib/landing-page-config";
import type { LandingPageConfig } from "@/lib/landing-page-config";

export const dynamic = "force-dynamic";

// ─── GET /api/platform/landing-page ──────────────────────────────────
// Public endpoint — returns landing page configuration for the homepage.
// Falls back to hardcoded defaults when no DB row exists.
// Strips contactSocial before sending to public (those are fetched via public-settings).
export async function GET() {
  try {
    const row = await db.platformSetting.findUnique({
      where: { setting_key: LANDING_PAGE_CONFIG_KEY },
    });

    if (!row) {
      return NextResponse.json(DEFAULT_LANDING_PAGE_CONFIG);
    }

    const dbConfig = JSON.parse(row.setting_value) as Partial<LandingPageConfig>;
    const merged = mergeWithDefaults(dbConfig);
    return NextResponse.json(merged);
  } catch (error) {
    console.error("Landing page config GET error:", error);
    // Graceful fallback — never break the landing page
    return NextResponse.json(DEFAULT_LANDING_PAGE_CONFIG);
  }
}
