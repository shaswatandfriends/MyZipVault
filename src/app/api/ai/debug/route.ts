import { NextResponse } from "next/server";

/**
 * Debug endpoint to check if ZAI env vars are available.
 * This helps diagnose AI initialization failures on Vercel.
 */
export async function GET() {
  const envStatus = {
    ZAI_BASE_URL: !!process.env.ZAI_BASE_URL,
    ZAI_API_KEY: !!process.env.ZAI_API_KEY,
    ZAI_CHAT_ID: !!process.env.ZAI_CHAT_ID,
    ZAI_TOKEN: !!process.env.ZAI_TOKEN,
    ZAI_USER_ID: !!process.env.ZAI_USER_ID,
    // Show partial values for debugging (not full secrets)
    baseUrlPrefix: process.env.ZAI_BASE_URL
      ? process.env.ZAI_BASE_URL.substring(0, 15) + "..."
      : "NOT SET",
    apiKeyPrefix: process.env.ZAI_API_KEY
      ? process.env.ZAI_API_KEY.substring(0, 3) + "..."
      : "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "not on vercel",
  };

  // Also try to initialize ZAI
  let zaiStatus = "not_tested";
  try {
    const { createZAI } = await import("@/lib/zai");
    const zai = await createZAI();
    zaiStatus = "success";
  } catch (err) {
    zaiStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({
    envVars: envStatus,
    zaiInitialization: zaiStatus,
    timestamp: new Date().toISOString(),
  });
}
