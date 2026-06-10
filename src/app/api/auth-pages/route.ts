import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  AUTH_PAGE_CONFIG_KEY,
  DEFAULT_AUTH_PAGE_CONFIG,
  mergeWithDefaults,
} from "@/lib/auth-page-config";
import type { AuthPageConfig } from "@/lib/auth-page-config";

export const dynamic = "force-dynamic";

// ─── GET /api/auth-pages ──────────────────────────────────────────────
// Public endpoint — returns auth page configuration for the login/signup
// forms to render. Falls back to hardcoded defaults when no DB row exists.
export async function GET() {
  try {
    const row = await db.platformSetting.findUnique({
      where: { setting_key: AUTH_PAGE_CONFIG_KEY },
    });

    if (!row) {
      return NextResponse.json(DEFAULT_AUTH_PAGE_CONFIG);
    }

    const dbConfig = JSON.parse(row.setting_value) as Partial<AuthPageConfig>;
    const merged = mergeWithDefaults(dbConfig);
    return NextResponse.json(merged);
  } catch (error) {
    console.error("Auth pages config GET error:", error);
    // Graceful fallback — never break auth pages
    return NextResponse.json(DEFAULT_AUTH_PAGE_CONFIG);
  }
}
