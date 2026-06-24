import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiGenerateText } from "@/lib/ai-provider";

/**
 * Server-side AI proxy — uses the triple-provider system (Groq → Gemini → GLM).
 *
 * This route is called by the client-side AI chat panel.
 * It forwards the request through the abstraction layer which handles
 * provider selection, fallback, and error recovery automatically.
 */
export async function POST(request: Request) {
  // Auth check
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized — please log in" }, { status: 401 });
    }
  } catch {
    console.warn("[AI_PROXY] Could not verify session, proceeding without auth check");
  }

  // Parse the request body
  let body: {
    messages?: { role: string; content: string }[];
    temperature?: number;
    max_tokens?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
  }

  // Extract system + user messages for the AI provider
  const messages = body.messages;
  const systemMsg = messages.find((m) => m.role === "system");
  const userMsgs = messages.filter((m) => m.role !== "system");

  // Combine user messages into a single prompt
  const userPrompt = userMsgs.map((m) => m.content).join("\n\n");
  const systemPrompt = systemMsg?.content;

  try {
    const result = await aiGenerateText({
      systemPrompt,
      userPrompt,
      temperature: body.temperature ?? 0.7,
      maxTokens: body.max_tokens ?? 2000,
    });

    return NextResponse.json({
      choices: [
        {
          finish_reason: "stop",
          index: 0,
          message: {
            content: result.content,
            role: "assistant",
          },
        },
      ],
      provider: result.provider,
      usage: result.usage
        ? {
            prompt_tokens: result.usage.promptTokens,
            completion_tokens: result.usage.completionTokens,
            total_tokens: result.usage.totalTokens,
          }
        : undefined,
    });
  } catch (err) {
    console.error("[AI_PROXY] All AI providers failed:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "AI generation failed. All providers unavailable. Please try again later.", details: errMsg },
      { status: 502 }
    );
  }
}
