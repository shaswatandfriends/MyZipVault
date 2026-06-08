import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Server-side AI proxy — forwards AI requests to the ZAI API.
 *
 * Why this exists:
 * - On Vercel, serverless functions cannot reach internal-api.z.ai (private IPs)
 * - On the user's browser, the same DNS resolution issue prevents direct API calls
 * - This proxy route centralizes the AI call logic so the client doesn't need
 *   to know about the ZAI API credentials or network topology
 *
 * How it works:
 * - Client sends a POST with { messages, temperature?, max_tokens?, isVision? }
 * - This route reads ZAI credentials from env vars and forwards the request
 * - On success, returns the AI response
 * - On failure (e.g. Vercel can't reach the API), returns a clear error
 *
 * In local dev: works perfectly (server can reach internal-api.z.ai)
 * On Vercel: will fail with a clear error message since the API is on private IPs
 */
export async function POST(request: Request) {
  // Auth check — only logged-in users can use AI
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized — please log in" }, { status: 401 });
    }
  } catch {
    console.warn("[AI_PROXY] Could not verify session, proceeding without auth check");
  }

  // Read ZAI config from env vars
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  const chatId = process.env.ZAI_CHAT_ID || "";
  const token = process.env.ZAI_TOKEN || "";
  const userId = process.env.ZAI_USER_ID || "";

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "AI service not configured on this server. Please add ZAI_BASE_URL and ZAI_API_KEY environment variables." },
      { status: 503 }
    );
  }

  // Parse the request body
  let body: {
    messages?: unknown[];
    temperature?: number;
    max_tokens?: number;
    isVision?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
  }

  // Determine if this is a vision request
  const isVision = body.isVision === true;
  const endpoint = isVision ? "/chat/completions/vision" : "/chat/completions";

  // Build the ZAI API request
  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Z-AI-From": "Z",
  };
  if (chatId) headers["X-Chat-Id"] = chatId;
  if (userId) headers["X-User-Id"] = userId;
  if (token) headers["X-Token"] = token;

  const requestBody = {
    messages: body.messages,
    temperature: body.temperature ?? (isVision ? 0.1 : 0.7),
    max_tokens: body.max_tokens ?? 2000,
    thinking: { type: "disabled" },
  };

  // Forward the request to ZAI API
  try {
    console.log(`[AI_PROXY] Forwarding ${isVision ? "vision" : "chat"} request to ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60000), // 60s timeout for AI responses
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[AI_PROXY] ZAI API returned ${response.status}: ${errorBody.substring(0, 500)}`);
      return NextResponse.json(
        { error: `AI service returned error ${response.status}`, details: errorBody.substring(0, 200) },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data = await response.json();
    console.log("[AI_PROXY] Request succeeded");
    return NextResponse.json(data);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[AI_PROXY] Request failed:", errMsg);

    // Detect network/DNS failures (Vercel can't reach private IPs)
    if (
      errMsg.includes("fetch failed") ||
      errMsg.includes("ECONNREFUSED") ||
      errMsg.includes("ENOTFOUND") ||
      errMsg.includes("Timeout") ||
      errMsg.includes("timeout")
    ) {
      return NextResponse.json(
        {
          error:
            "AI service is currently unavailable. The AI provider's server is not reachable from this hosting environment. This is a known limitation when deployed on Vercel — the AI API uses an internal network address. Please try again later or contact support.",
          details: errMsg,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "AI service call failed. Please try again.", details: errMsg },
      { status: 502 }
    );
  }
}
