/**
 * Unified AI helper — tries Groq first (fast, 500+ tokens/sec), falls
 * back to ZAI if Groq fails or is rate-limited.
 *
 * Both services expose the same OpenAI-compatible chat completions API,
 * so we can use either transparently.
 */

import { groqChatCompletion, isGroqConfigured } from "./groq";
import { zaiChatCompletion, isZaiConfigured } from "./zai";

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
 * Make a chat completion request, trying Groq first then ZAI as fallback.
 *
 * Strategy:
 *   1. If Groq is configured → try Groq
 *   2. If Groq fails (rate limit, error, etc.) AND ZAI is configured → try ZAI
 *   3. If neither is configured → throw clear error
 */
export async function aiChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const errors: string[] = [];

  // ── Try Groq first ──
  if (isGroqConfigured()) {
    try {
      console.log("[AI] Trying Groq...");
      const result = await groqChatCompletion(options);
      console.log("[AI] Groq succeeded");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Groq: ${msg}`);
      console.warn("[AI] Groq failed:", msg);
      // Fall through to ZAI
    }
  }

  // ── Fallback to ZAI ──
  if (isZaiConfigured()) {
    try {
      console.log("[AI] Trying ZAI...");
      const result = await zaiChatCompletion(options);
      console.log("[AI] ZAI succeeded");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`ZAI: ${msg}`);
      console.warn("[AI] ZAI failed:", msg);
      // Fall through to error
    }
  }

  // ── Both failed or neither configured ──
  if (errors.length > 0) {
    throw new Error(`All AI providers failed: ${errors.join("; ")}`);
  }

  throw new Error(
    "No AI provider configured. Set either GROQ_API_KEY or ZAI_API_KEY in your environment variables."
  );
}

/**
 * Check if ANY AI provider is configured.
 */
export function isAIConfigured(): boolean {
  return isGroqConfigured() || isZaiConfigured();
}
