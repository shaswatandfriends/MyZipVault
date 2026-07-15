/**
 * ZAI / GLM API integration — updated for z.ai API key format.
 *
 * The new z.ai API uses a single API key in {id}.{secret} format.
 * Endpoint: https://api.z.ai/api/paas/v4/chat/completions
 * Auth: Bearer {api_key}
 *
 * Env vars:
 *   ZAI_API_KEY  — the full key (e.g., "44a0...kTqe")
 *   ZAI_BASE_URL — defaults to "https://api.z.ai/api/paas/v4"
 */

const DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4";
const DEFAULT_MODEL = "glm-4.7-flash"; // FREE text model
const DEFAULT_VISION_MODEL = "glm-4.6v-flash"; // FREE vision model

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
 * Check if ZAI is configured.
 */
export function isZaiConfigured(): boolean {
  return !!process.env.ZAI_API_KEY;
}

/**
 * Make a chat completion request to the ZAI/GLM API.
 * Uses the new z.ai API key format (Bearer token).
 */
export function isZaiConfigured(): boolean {
  return !!process.env.ZAI_API_KEY;
}

export async function zaiChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.ZAI_API_KEY;
  const baseUrl = process.env.ZAI_BASE_URL || DEFAULT_BASE_URL;
  const url = `${baseUrl}/chat/completions`;

  if (!apiKey) {
    throw new Error("ZAI_API_KEY not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const requestBody = {
    model: DEFAULT_MODEL,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2000,
    thinking: { type: "disabled" },
  };

  console.log(`[ZAI] Direct fetch to ${url} with model ${DEFAULT_MODEL}`);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ZAI API error ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  return (await response.json()) as ChatCompletionResponse;
}

// ─── Vision completion — for image-based requests ───────────────────

interface VisionMessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
}

interface VisionCompletionOptions {
  messages: {
    role: string;
    content: VisionMessageContent[];
  }[];
  temperature?: number;
  max_tokens?: number;
}

interface VisionCompletionResponse {
  choices: {
    finish_reason: string;
    index: number;
    message: { content: string; role: string };
  }[];
  id?: string;
  model?: string;
}

/**
 * Make a vision completion request (for image analysis like resume parsing).
 */
export async function zaiVisionCompletion(
  options: VisionCompletionOptions
): Promise<VisionCompletionResponse> {
  const apiKey = process.env.ZAI_API_KEY;
  const baseUrl = process.env.ZAI_BASE_URL || DEFAULT_BASE_URL;
  const url = `${baseUrl}/chat/completions`;

  if (!apiKey) {
    throw new Error("ZAI_API_KEY not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const requestBody = {
    model: DEFAULT_VISION_MODEL,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2000,
    thinking: { type: "disabled" },
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ZAI Vision API error ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  return (await response.json()) as VisionCompletionResponse;
}
