/**
 * Groq AI integration — ultra-fast inference using LPU chips.
 *
 * Env var: GROQ_API_KEY — from https://console.groq.com
 * Free tier: 30 req/min, 14,400 req/day
 * Speed: 500+ tokens/sec (LPU, not GPU)
 */

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

interface ChatCompletionOptions {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
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

export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export async function groqChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const url = `${GROQ_BASE_URL}/chat/completions`;
  const model = options.model || DEFAULT_MODEL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  return (await response.json()) as ChatCompletionResponse;
}
