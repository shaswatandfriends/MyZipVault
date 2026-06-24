/**
 * Groq AI integration — ultra-fast inference using LPU chips.
 *
 * Groq uses an OpenAI-compatible API format, making it the simplest
 * integration. No response conversion needed.
 *
 * Env var:
 *   GROQ_API_KEY — from https://console.groq.com
 *
 * Free tier: 30 req/min, 14,400 req/day
 * Speed: 500+ tokens/sec (LPU, not GPU)
 *
 * Models:
 *   openai/gpt-oss-120b — latest, best quality
 *   llama-3.3-70b-versatile — reliable, good quality
 *   llama-3.1-8b-instant — fastest, cheapest
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

/**
 * Check if Groq is configured.
 */
export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Make a chat completion request to Groq.
 * Uses OpenAI-compatible format — no conversion needed.
 */
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

/**
 * Make a vision request to Groq (for image/document analysis).
 * Groq supports vision via the chat completions endpoint with image_url content.
 */
export async function groqVisionCompletion(options: {
  prompt: string;
  base64Data: string;
  mimeType: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<{
  choices: {
    finish_reason: string;
    index: number;
    message: { content: string; role: string };
  }[];
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const url = `${GROQ_BASE_URL}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${options.mimeType};base64,${options.base64Data}`,
              },
            },
          ],
        },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq Vision API error ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  return (await response.json()) as {
    choices: {
      finish_reason: string;
      index: number;
      message: { content: string; role: string };
    }[];
  };
}
