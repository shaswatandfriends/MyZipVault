/**
 * AI Provider Abstraction Layer
 *
 * This is the SINGLE entry point for ALL AI features in MyZipVault.
 * It abstracts away which AI provider is used (Gemini, GLM/ZAI, etc.)
 * and provides automatic fallback if the primary provider fails.
 *
 * Superadmin can configure which provider is primary via PlatformSetting:
 *   ai_primary_provider = "gemini" | "glm"
 *
 * Usage:
 *   import { aiGenerateText, aiAnalyzeDocument } from "@/lib/ai-provider";
 *
 *   const result = await aiGenerateText({
 *     systemPrompt: "You are a resume expert.",
 *     userPrompt: "Improve this resume summary: ...",
 *   });
 *
 * Architecture:
 *
 *   aiGenerateText()
 *         │
 *    ┌────┴────┐
 *    ▼         ▼
 *  Primary   (if primary fails)
 *  Provider  → Fallback Provider
 *    │            │
 *    ▼            ▼
 *  Result     Result or Error
 */

import { db } from "@/lib/db";

export type AIProvider = "groq" | "gemini" | "glm";

export interface AIGenerateOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerateResult {
  content: string;
  provider: AIProvider;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface AIAnalyzeDocumentOptions {
  prompt: string;
  base64Data: string;
  mimeType: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIAnalyzeDocumentResult {
  content: string;
  provider: AIProvider;
}

// ─── Provider configuration cache ───────────────────────────────────
let primaryProviderCache: AIProvider | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the configured primary AI provider from PlatformSetting.
 * Falls back to "gemini" if not configured.
 * If the primary provider's API key is not set, tries the other.
 */
export async function getPrimaryProvider(): Promise<AIProvider> {
  const now = Date.now();
  if (primaryProviderCache && now - cacheTime < CACHE_TTL) {
    return primaryProviderCache;
  }

  try {
    const setting = await db.platformSetting.findUnique({
      where: { setting_key: "ai_primary_provider" },
    });
    primaryProviderCache = (setting?.setting_value as AIProvider) || "groq";
  } catch {
    primaryProviderCache = "groq";
  }

  cacheTime = now;

  // If primary provider's key is not set, try others in priority order: groq > gemini > glm
  const { isGroqConfigured } = await import("@/lib/groq");
  const { isGeminiConfigured } = await import("@/lib/gemini");
  const { isZaiConfigured } = await import("@/lib/zai");

  const isConfigured: Record<AIProvider, boolean> = {
    groq: isGroqConfigured(),
    gemini: isGeminiConfigured(),
    glm: isZaiConfigured(),
  };

  if (!isConfigured[primaryProviderCache]) {
    // Find first configured provider in priority order
    for (const p of ["groq", "gemini", "glm"] as AIProvider[]) {
      if (isConfigured[p]) {
        primaryProviderCache = p;
        break;
      }
    }
  }

  return primaryProviderCache;
}

/**
 * Get fallback providers in priority order (excluding primary).
 */
export function getFallbackProviders(primary: AIProvider): AIProvider[] {
  const all: AIProvider[] = ["groq", "gemini", "glm"];
  return all.filter((p) => p !== primary);
}

// ─── Text generation ────────────────────────────────────────────────

/**
 * Generate text using the multi-provider AI system.
 *
 * Tries providers in order: primary → fallback 1 → fallback 2.
 * Returns the first successful result. If all fail, throws an error.
 */
export async function aiGenerateText(
  options: AIGenerateOptions
): Promise<AIGenerateResult> {
  const primary = await getPrimaryProvider();
  const fallbacks = getFallbackProviders(primary);
  const providersToTry = [primary, ...fallbacks];

  const messages: { role: string; content: string }[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: options.userPrompt });

  const errors: string[] = [];

  for (const provider of providersToTry) {
    try {
      const result = await generateWithProvider(provider, messages, options);
      if (provider !== primary && process.env.NODE_ENV === "development") {
        console.log(`[AI_PROVIDER] Fallback (${provider}) succeeded after (${primary}) failed`);
      }
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI_PROVIDER] ${provider} failed: ${errMsg}`);
      errors.push(`${provider}: ${errMsg}`);
    }
  }

  throw new Error(
    `AI generation failed. All providers unavailable. ` +
    errors.join("; ")
  );
}

async function generateWithProvider(
  provider: AIProvider,
  messages: { role: string; content: string }[],
  options: AIGenerateOptions
): Promise<AIGenerateResult> {
  if (provider === "groq") {
    const { groqChatCompletion } = await import("@/lib/groq");
    const result = await groqChatCompletion({
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    return {
      content: result.choices[0]?.message?.content || "",
      provider: "groq",
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
    };
  } else if (provider === "gemini") {
    const { geminiChatCompletion } = await import("@/lib/gemini");
    const result = await geminiChatCompletion({
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    return {
      content: result.choices[0]?.message?.content || "",
      provider: "gemini",
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
    };
  } else {
    const { zaiChatCompletion } = await import("@/lib/zai");
    const result = await zaiChatCompletion({
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    return {
      content: result.choices[0]?.message?.content || "",
      provider: "glm",
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
    };
  }
}

// ─── Document analysis (vision) ─────────────────────────────────────

/**
 * Analyze a document (PDF, image) using the multi-provider AI system.
 * Tries providers in order: primary → fallback 1 → fallback 2.
 */
export async function aiAnalyzeDocument(
  options: AIAnalyzeDocumentOptions
): Promise<AIAnalyzeDocumentResult> {
  const primary = await getPrimaryProvider();
  const fallbacks = getFallbackProviders(primary);
  const providersToTry = [primary, ...fallbacks];

  const errors: string[] = [];

  for (const provider of providersToTry) {
    try {
      const result = await analyzeWithProvider(provider, options);
      if (provider !== primary && process.env.NODE_ENV === "development") {
        console.log(`[AI_PROVIDER] Vision fallback (${provider}) succeeded`);
      }
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI_PROVIDER] ${provider} vision failed: ${errMsg}`);
      errors.push(`${provider}: ${errMsg}`);
    }
  }

  throw new Error(
    `AI document analysis failed. All providers unavailable. ` +
    errors.join("; ")
  );
}

async function analyzeWithProvider(
  provider: AIProvider,
  options: AIAnalyzeDocumentOptions
): Promise<AIAnalyzeDocumentResult> {
  if (provider === "gemini") {
    const { geminiVisionCompletion } = await import("@/lib/gemini");
    const result = await geminiVisionCompletion({
      prompt: options.prompt,
      base64Data: options.base64Data,
      mimeType: options.mimeType,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    return {
      content: result.choices[0]?.message?.content || "",
      provider: "gemini",
    };
  } else {
    const { zaiVisionCompletion } = await import("@/lib/zai");
    const result = await zaiVisionCompletion({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            { type: "image_url", image_url: { url: `data:${options.mimeType};base64,${options.base64Data}` } },
          ],
        },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    return {
      content: result.choices[0]?.message?.content || "",
      provider: "glm",
    };
  }
}

// ─── Status check ───────────────────────────────────────────────────

/**
 * Check which AI providers are configured and available.
 */
export async function getAIProviderStatus(): Promise<{
  primary: AIProvider;
  groqConfigured: boolean;
  geminiConfigured: boolean;
  glmConfigured: boolean;
  anyAvailable: boolean;
}> {
  const { isGroqConfigured } = await import("@/lib/groq");
  const { isGeminiConfigured } = await import("@/lib/gemini");
  const { isZaiConfigured } = await import("@/lib/zai");
  const primary = await getPrimaryProvider();

  return {
    primary,
    groqConfigured: isGroqConfigured(),
    geminiConfigured: isGeminiConfigured(),
    glmConfigured: isZaiConfigured(),
    anyAvailable: isGroqConfigured() || isGeminiConfigured() || isZaiConfigured(),
  };
}
