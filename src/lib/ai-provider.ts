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

export type AIProvider = "gemini" | "glm";

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
    primaryProviderCache = (setting?.setting_value as AIProvider) || "gemini";
  } catch {
    primaryProviderCache = "gemini";
  }

  cacheTime = now;

  // If primary provider's key is not configured, try fallback
  const { isGeminiConfigured } = await import("@/lib/gemini");
  const { isZaiConfigured } = await import("@/lib/zai");

  if (primaryProviderCache === "gemini" && !isGeminiConfigured()) {
    if (isZaiConfigured()) return "glm";
  }
  if (primaryProviderCache === "glm" && !isZaiConfigured()) {
    if (isGeminiConfigured()) return "gemini";
  }

  return primaryProviderCache;
}

/**
 * Get the fallback provider (the opposite of primary).
 */
export function getFallbackProvider(primary: AIProvider): AIProvider {
  return primary === "gemini" ? "glm" : "gemini";
}

// ─── Text generation ────────────────────────────────────────────────

/**
 * Generate text using the dual-provider AI system.
 *
 * Tries primary provider first. If it fails (timeout, API error, etc.),
 * falls back to the secondary provider. If both fail, throws an error.
 */
export async function aiGenerateText(
  options: AIGenerateOptions
): Promise<AIGenerateResult> {
  const primary = await getPrimaryProvider();
  const fallback = getFallbackProvider(primary);

  const messages: { role: string; content: string }[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: options.userPrompt });

  // Try primary provider
  try {
    const result = await generateWithProvider(primary, messages, options);
    return result;
  } catch (primaryErr) {
    console.warn(`[AI_PROVIDER] Primary (${primary}) failed:`, primaryErr);

    // Try fallback provider
    try {
      const result = await generateWithProvider(fallback, messages, options);
      console.log(`[AI_PROVIDER] Fallback (${fallback}) succeeded`);
      return result;
    } catch (fallbackErr) {
      console.error(`[AI_PROVIDER] Both providers failed. Primary: ${primary}, Fallback: ${fallback}`);
      throw new Error(
        `AI generation failed. Both providers unavailable. ` +
        `Primary (${primary}): ${primaryErr instanceof Error ? primaryErr.message : "unknown"}. ` +
        `Fallback (${fallback}): ${fallbackErr instanceof Error ? fallbackErr.message : "unknown"}.`
      );
    }
  }
}

async function generateWithProvider(
  provider: AIProvider,
  messages: { role: string; content: string }[],
  options: AIGenerateOptions
): Promise<AIGenerateResult> {
  if (provider === "gemini") {
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
 * Analyze a document (PDF, image) using the dual-provider AI system.
 * Tries primary first, falls back to secondary.
 */
export async function aiAnalyzeDocument(
  options: AIAnalyzeDocumentOptions
): Promise<AIAnalyzeDocumentResult> {
  const primary = await getPrimaryProvider();
  const fallback = getFallbackProvider(primary);

  // Try primary provider
  try {
    const result = await analyzeWithProvider(primary, options);
    return result;
  } catch (primaryErr) {
    console.warn(`[AI_PROVIDER] Primary (${primary}) vision failed:`, primaryErr);

    // Try fallback provider
    try {
      const result = await analyzeWithProvider(fallback, options);
      console.log(`[AI_PROVIDER] Fallback (${fallback}) vision succeeded`);
      return result;
    } catch (fallbackErr) {
      console.error(`[AI_PROVIDER] Both vision providers failed.`);
      throw new Error(
        `AI document analysis failed. Both providers unavailable. ` +
        `Primary (${primary}): ${primaryErr instanceof Error ? primaryErr.message : "unknown"}. ` +
        `Fallback (${fallback}): ${fallbackErr instanceof Error ? fallbackErr.message : "unknown"}.`
      );
    }
  }
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
  geminiConfigured: boolean;
  glmConfigured: boolean;
  anyAvailable: boolean;
}> {
  const { isGeminiConfigured } = await import("@/lib/gemini");
  const { isZaiConfigured } = await import("@/lib/zai");
  const primary = await getPrimaryProvider();

  return {
    primary,
    geminiConfigured: isGeminiConfigured(),
    glmConfigured: isZaiConfigured(),
    anyAvailable: isGeminiConfigured() || isZaiConfigured(),
  };
}
