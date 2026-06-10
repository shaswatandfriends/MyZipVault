import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public endpoint — no auth required.
// Returns only whitelisted platform settings safe for public consumption.
const PUBLIC_SETTING_KEYS = [
  "social_linkedin_url",
  "social_facebook_url",
  "whatsapp_number",
];

export async function GET() {
  try {
    const settings = await db.platformSetting.findMany({
      where: {
        setting_key: { in: PUBLIC_SETTING_KEYS },
      },
      select: {
        setting_key: true,
        setting_value: true,
      },
    });

    // Convert array to flat object { social_linkedin_url: "...", ... }
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.setting_key] = s.setting_value;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Public settings GET error:", error);
    // Return empty object instead of error — landing page should still render
    return NextResponse.json({});
  }
}
