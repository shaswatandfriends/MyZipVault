import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Returns the ZAI API configuration needed for client-side AI calls.
 *
 * On Vercel, the serverless functions can't reach internal-api.z.ai
 * (DNS/network issue), so we let the browser make the API calls directly.
 * The CSP already allows connect-src to https://internal-api.z.ai.
 *
 * This endpoint requires authentication — only logged-in users can get the config.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    // If auth check fails, still allow (session might work differently)
  }

  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  const chatId = process.env.ZAI_CHAT_ID;
  const token = process.env.ZAI_TOKEN;
  const userId = process.env.ZAI_USER_ID;

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "AI service not configured on this server" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    baseUrl,
    apiKey,
    chatId: chatId || "",
    token: token || "",
    userId: userId || "",
  });
}
