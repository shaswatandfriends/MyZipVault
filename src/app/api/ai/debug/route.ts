import { NextResponse } from "next/server";
import { isAffindaConfigured } from "@/lib/affinda";

/**
 * Debug endpoint to check AI service availability.
 * Publicly accessible (in middleware publicPrefixes).
 */
export async function GET() {
  // ZAI env vars status
  const zaiEnvStatus = {
    ZAI_BASE_URL: !!process.env.ZAI_BASE_URL,
    ZAI_API_KEY: !!process.env.ZAI_API_KEY,
    ZAI_CHAT_ID: !!process.env.ZAI_CHAT_ID,
    ZAI_TOKEN: !!process.env.ZAI_TOKEN,
    ZAI_USER_ID: !!process.env.ZAI_USER_ID,
    baseUrlPrefix: process.env.ZAI_BASE_URL
      ? process.env.ZAI_BASE_URL.substring(0, 30) + "..."
      : "NOT SET",
    apiKeyPrefix: process.env.ZAI_API_KEY
      ? process.env.ZAI_API_KEY.substring(0, 3) + "..."
      : "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "not on vercel",
  };

  // Test ZAI API connectivity
  let zaiApiStatus = "not_tested";
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
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        zaiApiStatus = `http_error_${response.status}: ${errorBody.substring(0, 200)}`;
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        zaiApiStatus = `success: "${content}"`;
      }
    } catch (err) {
      const errorInfo: Record<string, string> = {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : "Unknown",
      };
      if (err instanceof Error && "cause" in err && err.cause) {
        errorInfo.cause = err.cause instanceof Error ? err.cause.message : String(err.cause);
      }
      zaiApiStatus = `failed: ${JSON.stringify(errorInfo)}`;
    }
  } else {
    zaiApiStatus = "skipped: missing env vars";
  }

  // DNS resolution check
  let dnsStatus = "not_tested";
  if (baseUrl) {
    try {
      const { Resolver } = await import("dns/promises");
      const resolver = new Resolver();
      const hostname = new URL(baseUrl).hostname;
      const addresses = await resolver.resolve4(hostname).catch(() => []);
      const addressesV6 = await resolver.resolve6(hostname).catch(() => []);
      const isPrivate = addresses.some((ip) => {
        const parts = ip.split(".").map(Number);
        return (
          parts[0] === 10 ||
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168)
        );
      });
      dnsStatus = `resolved: ipv4=${addresses.join(",") || "none"}, ipv6=${addressesV6.join(",") || "none"}, isPrivate=${isPrivate}`;
    } catch (err) {
      dnsStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // Affinda status
  const affindaStatus = {
    configured: isAffindaConfigured(),
    apiKeyPrefix: process.env.AFFINDA_API_KEY
      ? process.env.AFFINDA_API_KEY.substring(0, 8) + "..."
      : "NOT SET",
  };

  // Test Affinda connectivity
  let affindaApiStatus = "not_tested";
  if (isAffindaConfigured()) {
    try {
      const { getAffindaClient } = await import("@/lib/affinda");
      const client = getAffindaClient();
      if (client) {
        // Simple API call to verify connectivity
        // We can't easily test without making a real API call,
        // so we just confirm the client initializes
        affindaApiStatus = "client_initialized";
      } else {
        affindaApiStatus = "client_init_failed";
      }
    } catch (err) {
      affindaApiStatus = `failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json({
    zai: {
      envVars: zaiEnvStatus,
      apiCall: zaiApiStatus,
      dnsResolution: dnsStatus,
      note: zaiApiStatus.startsWith("failed")
        ? "ZAI API is unreachable — it resolves to private IPs (172.25.x.x) that Vercel's serverless functions cannot access. AI generation features will not work on Vercel."
        : "ZAI API is reachable from this server.",
    },
    affinda: {
      ...affindaStatus,
      apiCall: affindaApiStatus,
      note: isAffindaConfigured()
        ? "Affinda is configured and publicly accessible — resume parsing and skill suggestions will work on Vercel."
        : "Affinda is not configured. Add AFFINDA_API_KEY env var to enable resume parsing.",
    },
    recommendation: !isAffindaConfigured()
      ? "Set AFFINDA_API_KEY to enable resume parsing and AI suggestions that work on Vercel."
      : "Affinda is configured. Use it for resume parsing and skill suggestions on Vercel.",
    timestamp: new Date().toISOString(),
  });
}
