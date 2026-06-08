import { NextResponse } from "next/server";

/**
 * Debug endpoint to check if ZAI env vars are available and AI works.
 * This helps diagnose AI initialization failures on Vercel.
 * Publicly accessible (in middleware publicPrefixes).
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
      ? process.env.ZAI_BASE_URL.substring(0, 30) + "..."
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

  // Step 1: Try to initialize ZAI SDK (only works if .z-ai-config file exists)
  let zaiInitStatus = "not_tested";
  let zaiConfigInfo: Record<string, unknown> = {};
  try {
    const { createZAI } = await import("@/lib/zai");
    const zai = await createZAI();
    zaiInitStatus = "success";
    zaiConfigInfo = {
      hasBaseUrl: !!(zai as Record<string, unknown>).config && !!(zai as Record<string, Record<string, unknown>>).config?.baseUrl,
      hasApiKey: !!(zai as Record<string, Record<string, unknown>>).config?.apiKey,
      hasToken: !!(zai as Record<string, Record<string, unknown>>).config?.token,
      hasChatId: !!(zai as Record<string, Record<string, unknown>>).config?.chatId,
    };
  } catch (err) {
    zaiInitStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  // Step 2: Test direct fetch (bypassing SDK)
  let directFetchStatus = "not_tested";
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  if (baseUrl && apiKey) {
    const chatId = process.env.ZAI_CHAT_ID || "";
    const token = process.env.ZAI_TOKEN || "";
    const userId = process.env.ZAI_USER_ID || "";
    const url = `${baseUrl}/chat/completions`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Z-AI-From": "Z",
      };
      if (chatId) headers["X-Chat-Id"] = chatId;
      if (userId) headers["X-User-Id"] = userId;
      if (token) headers["X-Token"] = token;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 5,
          thinking: { type: "disabled" },
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        const errorBody = await response.text();
        directFetchStatus = `http_error_${response.status}: ${errorBody.substring(0, 200)}`;
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        directFetchStatus = `success: "${content}"`;
      }
    } catch (err) {
      // Capture detailed error info
      const errorInfo: Record<string, string> = {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : "Unknown",
      };
      if (err instanceof Error && "cause" in err && err.cause) {
        errorInfo.cause = err.cause instanceof Error ? err.cause.message : String(err.cause);
      }
      if (err instanceof TypeError) {
        errorInfo.type = "TypeError";
      }
      directFetchStatus = `failed: ${JSON.stringify(errorInfo)}`;
    }
  } else {
    directFetchStatus = "skipped: missing env vars";
  }

  // Step 3: Test DNS resolution of the API domain
  let dnsStatus = "not_tested";
  if (baseUrl) {
    try {
      const { Resolver } = await import("dns/promises");
      const resolver = new Resolver();
      const hostname = new URL(baseUrl).hostname;
      const addresses = await resolver.resolve4(hostname).catch(() => []);
      const addressesV6 = await resolver.resolve6(hostname).catch(() => []);
      dnsStatus = `resolved: ipv4=${addresses.join(",") || "none"}, ipv6=${addressesV6.join(",") || "none"}`;
    } catch (err) {
      dnsStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json({
    envVars: envStatus,
    zaiInitialization: zaiInitStatus,
    zaiConfig: zaiConfigInfo,
    directFetch: directFetchStatus,
    dnsResolution: dnsStatus,
    timestamp: new Date().toISOString(),
  });
}
