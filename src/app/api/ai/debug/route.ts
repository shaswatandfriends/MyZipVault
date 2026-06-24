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

  // Test ZAI API connectivity — uses the updated zaiChatCompletion function
  let zaiApiStatus = "not_tested";
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  if (baseUrl && apiKey) {
    try {
      const { zaiChatCompletion } = await import("@/lib/zai");
      const result = await zaiChatCompletion({
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      const content = result.choices?.[0]?.message?.content;
      zaiApiStatus = `success: "${content}"`;
    } catch (err: any) {
      zaiApiStatus = `failed: ${err.message || String(err)}`;
    }
  } else {
    zaiApiStatus = "skipped: ZAI_API_KEY or ZAI_BASE_URL not set";
  }

  // DNS resolution check (for debugging connectivity issues)
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

  // ─── Gemini status ────────────────────────────────────────────────
  const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
  let geminiApiStatus = "not_tested";

  if (geminiApiKey) {
    try {
      const { geminiChatCompletion } = await import("@/lib/gemini");
      const result = await geminiChatCompletion({
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      const content = result.choices?.[0]?.message?.content;
      geminiApiStatus = `success: "${content}"`;
    } catch (err: any) {
      geminiApiStatus = `failed: ${err.message || String(err)}`;
    }
  } else {
    geminiApiStatus = "skipped: GOOGLE_GEMINI_API_KEY not set";
  }

  // ─── Groq status ──────────────────────────────────────────────────
  const groqApiKey = process.env.GROQ_API_KEY;
  let groqApiStatus = "not_tested";

  if (groqApiKey) {
    try {
      const { groqChatCompletion } = await import("@/lib/groq");
      const result = await groqChatCompletion({
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      const content = result.choices?.[0]?.message?.content;
      groqApiStatus = `success: "${content}"`;
    } catch (err: any) {
      groqApiStatus = `failed: ${err.message || String(err)}`;
    }
  } else {
    groqApiStatus = "skipped: GROQ_API_KEY not set";
  }

  // ─── AI Provider status ───────────────────────────────────────────
  let providerStatus = "not_tested";
  try {
    const { getAIProviderStatus } = await import("@/lib/ai-provider");
    const status = await getAIProviderStatus();
    providerStatus = `primary=${status.primary}, gemini=${status.geminiConfigured}, glm=${status.glmConfigured}, anyAvailable=${status.anyAvailable}`;
  } catch (err: any) {
    providerStatus = `failed: ${err.message || String(err)}`;
  }

  return NextResponse.json({
    zai: {
      envVars: zaiEnvStatus,
      apiCall: zaiApiStatus,
      dnsResolution: dnsStatus,
      note: !baseUrl || !apiKey
        ? "ZAI_API_KEY not set. Add ZAI_API_KEY and ZAI_BASE_URL to enable GLM."
        : zaiApiStatus.startsWith("failed")
        ? "ZAI API call failed. Check the error message above."
        : zaiApiStatus.startsWith("http_error")
        ? "ZAI API returned an HTTP error."
        : "ZAI API is reachable and responding.",
    },
    gemini: {
      configured: !!geminiApiKey,
      apiKeyPrefix: geminiApiKey ? geminiApiKey.substring(0, 10) + "..." : "NOT SET",
      apiCall: geminiApiStatus,
      note: !geminiApiKey
        ? "GOOGLE_GEMINI_API_KEY not set. Get one from https://aistudio.google.com/apikey"
        : geminiApiStatus.startsWith("failed")
        ? "Gemini API call failed. Check the error above."
        : "Gemini API is reachable and responding.",
    },
    groq: {
      configured: !!groqApiKey,
      apiKeyPrefix: groqApiKey ? groqApiKey.substring(0, 8) + "..." : "NOT SET",
      apiCall: groqApiStatus,
      note: !groqApiKey
        ? "GROQ_API_KEY not set. Get one from https://console.groq.com"
        : groqApiStatus.startsWith("failed")
        ? "Groq API call failed. Check the error above."
        : "Groq API is reachable and responding.",
    },
    aiProvider: providerStatus,
    affinda: {
      ...affindaStatus,
      apiCall: affindaApiStatus,
      note: isAffindaConfigured()
        ? "Affinda is configured — resume parsing and skill suggestions will work."
        : "Affinda is not configured. Add AFFINDA_API_KEY env var to enable resume parsing.",
    },
    recommendation: !geminiApiKey && !apiKey && !isAffindaConfigured()
      ? "No AI providers configured. Set GOOGLE_GEMINI_API_KEY and/or ZAI_API_KEY."
      : "AI providers configured. The dual-provider system will use the primary provider with automatic fallback.",
    timestamp: new Date().toISOString(),
  });
}
