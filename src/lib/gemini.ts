/**
 * Google Gemini AI integration.
 *
 * Uses the Gemini REST API (generativelanguage.googleapis.com).
 * Free tier: 15 requests/min, 1500 requests/day.
 *
 * Env var:
 *   GOOGLE_GEMINI_API_KEY — from https://aistudio.google.com/apikey
 *
 * Models:
 *   gemini-2.0-flash — fast, cheap, good for most tasks
 *   gemini-2.5-pro — best quality, slower
 */

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-flash-latest";

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates: {
    content: { parts: { text: string }[]; role: string };
    finishReason: string;
    index: number;
    safetyRatings: unknown[];
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Check if Gemini is configured.
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_GEMINI_API_KEY;
}

/**
 * Make a text generation request to Google Gemini.
 *
 * Converts OpenAI-style messages to Gemini format internally.
 */
export async function geminiChatCompletion(options: {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}): Promise<{
  choices: {
    finish_reason: string;
    index: number;
    message: { content: string; role: string };
  }[];
  id?: string;
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const model = options.model || DEFAULT_MODEL;
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  // Convert OpenAI-style messages to Gemini format
  // Gemini uses "user" and "model" roles
  // System messages are prepended to the first user message
  let systemPrompt = "";
  const contents: GeminiContent[] = [];

  for (const msg of options.messages) {
    if (msg.role === "system") {
      systemPrompt = msg.content;
    } else {
      const role = msg.role === "assistant" ? "model" : "user";
      const text = systemPrompt && role === "user" ? `${systemPrompt}\n\n${msg.content}` : msg.content;
      systemPrompt = ""; // Only prepend once
      contents.push({ role, parts: [{ text }] });
    }
  }

  // If system prompt was the only message, add it as a user message
  if (contents.length === 0 && systemPrompt) {
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
  }

  const requestBody = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.max_tokens ?? 2000,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  const data = (await response.json()) as GeminiResponse;

  // Convert Gemini response to OpenAI-compatible format
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

  return {
    choices: [
      {
        finish_reason: data.candidates?.[0]?.finishReason || "stop",
        index: 0,
        message: { content: text, role: "assistant" },
      },
    ],
    model,
    usage: data.usageMetadata
      ? {
          prompt_tokens: data.usageMetadata.promptTokenCount,
          completion_tokens: data.usageMetadata.candidatesTokenCount,
          total_tokens: data.usageMetadata.totalTokenCount,
        }
      : undefined,
  };
}

/**
 * Make a vision request to Gemini (for image/document analysis).
 * Supports base64-encoded images and documents.
 */
export async function geminiVisionCompletion(options: {
  prompt: string;
  base64Data: string;
  mimeType: string;
  temperature?: number;
  max_tokens?: number;
  model?: string;
}): Promise<{
  choices: {
    finish_reason: string;
    index: number;
    message: { content: string; role: string };
  }[];
}> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const model = options.model || DEFAULT_MODEL;
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: options.prompt },
          {
            inline_data: {
              mime_type: options.mimeType,
              data: options.base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.max_tokens ?? 2000,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini Vision API error ${response.status}: ${errorBody.substring(0, 500)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

  return {
    choices: [
      {
        finish_reason: data.candidates?.[0]?.finishReason || "stop",
        index: 0,
        message: { content: text, role: "assistant" },
      },
    ],
  };
}
