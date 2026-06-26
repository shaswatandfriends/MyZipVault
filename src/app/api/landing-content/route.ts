import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  LANDING_PAGE_CONFIG_KEY,
  DEFAULT_LANDING_PAGE_CONFIG,
  mergeWithDefaults,
} from "@/lib/landing-page-config";
import type { LandingPageConfig } from "@/lib/landing-page-config";

export const dynamic = "force-dynamic";

// GET /api/landing-content — public endpoint for landing page config
// Redirects to the platform/landing-page logic (same function, different URL)
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
    console.error("Landing content GET error:", error);
    return NextResponse.json(DEFAULT_LANDING_PAGE_CONFIG);
  }
}
