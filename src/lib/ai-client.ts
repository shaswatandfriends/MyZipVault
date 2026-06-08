/**
 * Client-side AI helper — makes API calls directly from the browser.
 *
 * On Vercel, the serverless functions can't reach internal-api.z.ai
 * (DNS/network issue in their Lambda runtime). The browser doesn't have
 * this restriction, so we make the AI calls client-side instead.
 *
 * The CSP already allows connect-src to https://internal-api.z.ai.
 */

interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId: string;
  token: string;
  userId: string;
}

interface ChatCompletionResponse {
  choices: {
    finish_reason: string;
    index: number;
    message: { content: string; role: string };
  }[];
  id?: string;
  model?: string;
}

// Cached config — fetch once, reuse for all subsequent calls
let cachedConfig: ZaiConfig | null = null;
let configPromise: Promise<ZaiConfig> | null = null;

/**
 * Get the ZAI API config, fetching it from the server on first call.
 */
async function getConfig(): Promise<ZaiConfig> {
  if (cachedConfig) return cachedConfig;

  if (configPromise) return configPromise;

  configPromise = (async () => {
    const res = await fetch("/api/ai/config");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to get AI config (status ${res.status})`);
    }
    const config = await res.json();
    cachedConfig = config as ZaiConfig;
    return cachedConfig;
  })();

  return configPromise;
}

/**
 * Build the common headers for ZAI API requests.
 */
function buildHeaders(config: ZaiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "X-Z-AI-From": "Z",
  };
  if (config.chatId) headers["X-Chat-Id"] = config.chatId;
  if (config.userId) headers["X-User-Id"] = config.userId;
  if (config.token) headers["X-Token"] = config.token;
  return headers;
}

/**
 * Make a chat completion request from the browser.
 */
export async function clientZaiChatCompletion(options: {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<ChatCompletionResponse> {
  const config = await getConfig();
  const url = `${config.baseUrl}/chat/completions`;
  const headers = buildHeaders(config);

  const requestBody = {
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
    throw new Error(`AI API error ${response.status}: ${errorBody}`);
  }

  return (await response.json()) as ChatCompletionResponse;
}

/**
 * Make a vision chat completion request from the browser.
 */
export async function clientZaiVisionCompletion(options: {
  messages: { role: string; content: string | unknown[] }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<ChatCompletionResponse> {
  const config = await getConfig();
  const url = `${config.baseUrl}/chat/completions/vision`;
  const headers = buildHeaders(config);

  const requestBody = {
    messages: options.messages,
    temperature: options.temperature ?? 0.1,
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
    throw new Error(`AI Vision API error ${response.status}: ${errorBody}`);
  }

  return (await response.json()) as ChatCompletionResponse;
}

/**
 * Clear the cached config (useful if the config expires or changes).
 */
export function clearZaiConfigCache(): void {
  cachedConfig = null;
  configPromise = null;
}
