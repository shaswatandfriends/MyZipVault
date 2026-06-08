import ZAI from "z-ai-web-dev-sdk";

/**
 * Initialize the ZAI SDK using the config file.
 * Only works in local dev where .z-ai-config exists.
 * On Vercel, use the direct fetch helpers instead (zaiChatCompletion, zaiVisionCompletion).
 */
export async function createZAI(): Promise<ZAI> {
  console.log("[ZAI] Initializing via ZAI.create() (reads .z-ai-config file)");
  return ZAI.create();
}

// ──────────────────────────────────────────────────
// Direct fetch helpers — bypass the SDK entirely.
//
// On Vercel, the SDK's internal `fetch` sometimes
// fails with "fetch failed" (likely IPv6 / DNS issue
// in Vercel's serverless runtime). These helpers use
// native `fetch` directly with the same request format
// the SDK would use, providing better error reporting
// and compatibility.
//
// The SDK constructor is private, so we can't instantiate
// it with env vars. Instead, we replicate the API calls
// using native fetch with env var configuration.
// ──────────────────────────────────────────────────

interface ChatCompletionOptions {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  choices: {
    finish_reason: string;
    index: number;
    message: { content: string; role: string };
  }[];
  id?: string;
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Build the common headers for ZAI API requests.
 */
function buildHeaders(): Record<string, string> {
  const apiKey = process.env.ZAI_API_KEY || "";
  const chatId = process.env.ZAI_CHAT_ID || "";
  const token = process.env.ZAI_TOKEN || "";
  const userId = process.env.ZAI_USER_ID || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Z-AI-From": "Z",
  };
  if (chatId) headers["X-Chat-Id"] = chatId;
  if (userId) headers["X-User-Id"] = userId;
  if (token) headers["X-Token"] = token;

  return headers;
}

/**
 * Make a chat completion request directly via native fetch,
 * bypassing the z-ai-web-dev-sdk wrapper.
 *
 * Uses env vars for configuration (works on Vercel).
 * Falls back to SDK if env vars are missing (local dev).
 */
export async function zaiChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  // If we have env vars, use direct fetch (more reliable on Vercel)
  if (baseUrl && apiKey) {
    const url = `${baseUrl}/chat/completions`;
    const headers = buildHeaders();

    const requestBody = {
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
      thinking: { type: "disabled" },
    };

    console.log(`[ZAI] Direct fetch to ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ZAI API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    console.log("[ZAI] Direct fetch succeeded");
    return data;
  }

  // No env vars — use SDK (local dev with .z-ai-config file)
  console.log("[ZAI] Using SDK (no env vars)");
  const zai = await createZAI();
  const completion = await zai.chat.completions.create({
    messages: options.messages as { role: "system" | "user" | "assistant"; content: string }[],
    temperature: options.temperature,
    max_tokens: options.max_tokens,
  });
  return completion as ChatCompletionResponse;
}

// ──────────────────────────────────────────────────
// Vision completion helper — for image-based requests
// like resume parsing with VLM.
// ──────────────────────────────────────────────────

interface VisionMessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
}

interface VisionCompletionOptions {
  messages: { role: string; content: string | VisionMessageContent[] }[];
  temperature?: number;
  max_tokens?: number;
}

/**
 * Make a vision chat completion request directly via native fetch.
 * Falls back to SDK if env vars are missing.
 */
export async function zaiVisionCompletion(
  options: VisionCompletionOptions
): Promise<ChatCompletionResponse> {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  // If we have env vars, use direct fetch
  if (baseUrl && apiKey) {
    const url = `${baseUrl}/chat/completions/vision`;
    const headers = buildHeaders();

    const requestBody = {
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.max_tokens ?? 2000,
      thinking: { type: "disabled" },
    };

    console.log(`[ZAI] Direct vision fetch to ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ZAI Vision API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    console.log("[ZAI] Direct vision fetch succeeded");
    return data;
  }

  // No env vars — use SDK
  console.log("[ZAI] Using SDK for vision (no env vars)");
  const zai = await createZAI();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completion = await zai.chat.completions.createVision({
    messages: options.messages as any,
    model: "glm-4v",
  } as any);
  return completion as ChatCompletionResponse;
}
