import { NextResponse } from "next/server";

/**
 * Debug endpoint to check if ZAI env vars are available and AI works.
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
      ? process.env.ZAI_BASE_URL.substring(0, 20) + "..."
      : "NOT SET",
    apiKeyPrefix: process.env.ZAI_API_KEY
      ? process.env.ZAI_API_KEY.substring(0, 3) + "..."
      : "NOT SET",
    tokenPrefix: process.env.ZAI_TOKEN
      ? process.env.ZAI_TOKEN.substring(0, 10) + "..."
      : "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "not on vercel",
  };

  // Step 1: Try to initialize ZAI
  let zaiInitStatus = "not_tested";
  let zaiConfigInfo = {};
  try {
    const { createZAI } = await import("@/lib/zai");
    const zai = await createZAI();
    zaiInitStatus = "success";
    // Check what config was loaded
    zaiConfigInfo = {
      hasBaseUrl: !!(zai as Record<string, unknown>).config && !!(zai as Record<string, Record<string, unknown>>).config?.baseUrl,
      hasApiKey: !!(zai as Record<string, Record<string, unknown>>).config?.apiKey,
      hasToken: !!(zai as Record<string, Record<string, unknown>>).config?.token,
      hasChatId: !!(zai as Record<string, Record<string, unknown>>).config?.chatId,
    };
  } catch (err) {
    zaiInitStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  // Step 2: Try an actual API call
  let apiCallStatus = "not_tested";
  try {
    const { createZAI } = await import("@/lib/zai");
    const zai = await createZAI();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    });
    const content = completion.choices?.[0]?.message?.content;
    apiCallStatus = `success: "${content}"`;
  } catch (err) {
    apiCallStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({
    envVars: envStatus,
    zaiInitialization: zaiInitStatus,
    zaiConfig: zaiConfigInfo,
    apiCall: apiCallStatus,
    timestamp: new Date().toISOString(),
  });
}
