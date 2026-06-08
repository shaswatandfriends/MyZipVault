/**
 * Client-side AI helper — makes API calls through our server-side proxy.
 *
 * Previous approach: Browser → internal-api.z.ai (failed because the API
 * resolves to private IPs 172.25.x.x that the public internet can't reach).
 *
 * New approach: Browser → /api/ai/proxy → internal-api.z.ai
 * The proxy route reads credentials from env vars and forwards the request.
 * This works in local dev where the server CAN reach the API.
 * On Vercel, the proxy detects the failure and returns a clear error.
 */

interface ChatCompletionResponse {
  choices: {
    finish_reason: string;
    index: number;
    message: { content: string; role: string };
  }[];
  id?: string;
  model?: string;
}

/**
 * Make a chat completion request through the server-side proxy.
 */
export async function clientZaiChatCompletion(options: {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<ChatCompletionResponse> {
  const response = await fetch("/api/ai/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
    }),
  });

  if (!response.ok) {
    let errorMsg = `AI service error (${response.status})`;
    try {
      const data = await response.json();
      errorMsg = data.error || data.details || errorMsg;
    } catch {
      // If we can't parse the error response, use the status code
    }
    throw new Error(errorMsg);
  }

  return (await response.json()) as ChatCompletionResponse;
}

/**
 * Make a vision chat completion request through the server-side proxy.
 * Uses the same proxy endpoint — the server-side route handles the
 * vision-specific URL path internally.
 */
export async function clientZaiVisionCompletion(options: {
  messages: { role: string; content: string | unknown[] }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<ChatCompletionResponse> {
  // Vision requests also go through the proxy
  // The proxy will detect this is a vision request based on message content
  const response = await fetch("/api/ai/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.max_tokens ?? 2000,
      isVision: true,
    }),
  });

  if (!response.ok) {
    let errorMsg = `AI Vision service error (${response.status})`;
    try {
      const data = await response.json();
      errorMsg = data.error || data.details || errorMsg;
    } catch {
      // If we can't parse the error response, use the status code
    }
    throw new Error(errorMsg);
  }

  return (await response.json()) as ChatCompletionResponse;
}

/**
 * Clear any cached config (no longer needed but kept for API compatibility).
 */
export function clearZaiConfigCache(): void {
  // No-op — we no longer cache config client-side
}
