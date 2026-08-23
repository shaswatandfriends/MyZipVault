/**
 * Unified AI helper — tries Groq first (fast, 500+ tokens/sec), falls
 * back to ZAI if Groq fails or is rate-limited.
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

export async function aiChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const errors: string[] = [];
  const isDev = process.env.NODE_ENV === "development";

  if (isGroqConfigured()) {
    try {
      if (isDev) console.log("[AI] Trying Groq...");
      const result = await groqChatCompletion(options);
      if (isDev) console.log("[AI] Groq succeeded");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Groq: ${msg}`);
      console.warn("[AI] Groq failed:", msg);
    }
  }

  if (isZaiConfigured()) {
    try {
      if (isDev) console.log("[AI] Trying ZAI...");
      const result = await zaiChatCompletion(options);
      if (isDev) console.log("[AI] ZAI succeeded");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`ZAI: ${msg}`);
      console.warn("[AI] ZAI failed:", msg);
    }
  }

  if (errors.length > 0) {
    throw new Error(`All AI providers failed: ${errors.join("; ")}`);
  }

  throw new Error(
    "No AI provider configured. Set either GROQ_API_KEY or ZAI_API_KEY in your environment variables."
  );
}

export function isAIConfigured(): boolean {
  return isGroqConfigured() || isZaiConfigured();
}
