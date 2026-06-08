import ZAI from "z-ai-web-dev-sdk";

/**
 * Initialize the ZAI SDK.
 *
 * Priority:
 * 1. Environment variables (ZAI_BASE_URL, ZAI_API_KEY, etc.) — works on Vercel
 * 2. .z-ai-config file in project/home — works locally
 * 3. ZAI.create() fallback — reads from file system only
 */
export async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  // If env vars are set, construct directly (Vercel / production)
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  if (baseUrl && apiKey) {
    const chatId = process.env.ZAI_CHAT_ID || "";
    const token = process.env.ZAI_TOKEN || "";
    const userId = process.env.ZAI_USER_ID || "";

    console.log("[ZAI] Initializing from environment variables");
    return new ZAI({ baseUrl, apiKey, chatId, token, userId });
  }

  // Fallback: use ZAI.create() which reads from .z-ai-config file
  console.log("[ZAI] No env vars found, falling back to .z-ai-config file");
  return ZAI.create();
}
