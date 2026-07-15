import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiChatCompletion } from "@/lib/ai-unified";

/**
 * POST /api/candidate/resume/tedo-chat
 *
 * Conversational resume builder. "Tedo" is an AI assistant that chats
 * with the candidate in a friendly, conversational way and progressively
 * builds their resume from scratch.
 *
 * Body: {
 *   message: string,           // candidate's latest message
 *   conversationHistory: { role: "user" | "assistant", content: string }[],
 *   resumeId?: number,         // existing resume being built (null = new)
 * }
 *
 * Returns: {
 *   reply: string,             // Tedo's response
 *   resumeData: <parsed schema> | null,  // updated resume data if Tedo extracted new info
 *   isComplete: boolean,       // true when Tedo thinks the resume is done
 * }
 */
export const TEDO_SYSTEM_PROMPT = `You are Tedo, a friendly AI resume assistant for healthcare professionals. You help candidates build their resume through natural conversation.

Your personality:
- Warm, encouraging, and conversational (not robotic)
- Ask ONE question at a time — never overwhelm with multiple questions
- Use the candidate's name if they've shared it
- Celebrate small wins ("Great! That's solid experience.")
- Keep your responses SHORT (2-4 sentences max) — this is a chat, not an essay

Your job:
1. Gather resume info through chat: contact, summary, experience, education, certifications, skills
2. Extract structured data from what the candidate tells you
3. When you have enough info (at least: name, contact, 1 experience, education, 2+ skills), tell them the resume is ready
4. If they want to add more, let them. If they say "that's all" or "looks good", mark as complete.

Conversation flow:
- Start by asking their name + what they do (e.g., "Hi! I'm Tedo. What's your name, and what kind of nursing do you do?")
- Then contact info (phone/email)
- Then current/most recent job (facility, unit, dates, what they did)
- Then previous jobs if any
- Then education
- Then certifications (BLS, ACLS, etc.)
- Then skills
- Then a professional summary (offer to write one for them based on what they've shared)

CRITICAL: With EVERY response, return the updated resume data based on what you've learned so far. Even if incomplete, return what you have.

Return ONLY valid JSON (no markdown):
{
  "reply": "your conversational response here",
  "resumeData": {
    "contact": { "fullName": "", "phone": "", "email": "", "address": "" },
    "summary": "",
    "experience": [{ "facility": "", "unit": "", "startDate": "", "endDate": "", "description": "" }],
    "education": [{ "school": "", "degree": "", "graduationYear": "" }],
    "certifications": [{ "name": "", "issuer": "", "year": "" }],
    "skills": [""]
  },
  "isComplete": false
}

Use empty strings/arrays for info you don't have yet. Set isComplete=true only when the resume has at least name, contact, 1 experience, education, and 2+ skills.
Return ONLY the JSON.`;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { message, conversationHistory } = body as {
      message: string;
      conversationHistory?: { role: string; content: string }[];
    };

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build the conversation messages for the AI
    const messages = [
      { role: "system", content: TEDO_SYSTEM_PROMPT },
      ...(conversationHistory || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await aiChatCompletion({
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || "";
    const jsonStr = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      // If JSON parse fails, return the raw text as the reply
      return NextResponse.json({
        reply: rawResponse,
        resumeData: null,
        isComplete: false,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TEDO_CHAT]", error);
    return NextResponse.json(
      { error: "Tedo is having trouble responding. Please try again." },
      { status: 500 }
    );
  }
}
