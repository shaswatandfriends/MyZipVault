import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiChatCompletion } from "@/lib/ai-unified";

/**
 * POST /api/candidate/resume/tedo-chat
 *
 * Tedo is a conversational AI resume builder. The key to making Tedo
 * "smart" is passing the CURRENT accumulated resumeData back to the AI
 * on every message, so it doesn't have to reconstruct data from chat
 * history — it just updates what's already there.
 */

interface ResumeData {
  contact?: { fullName?: string; phone?: string; email?: string; address?: string };
  summary?: string;
  experience?: { facility: string; unit: string; startDate: string; endDate: string; description: string }[];
  education?: { school: string; degree: string; graduationYear: string }[];
  certifications?: { name: string; issuer: string; year: string }[];
  skills?: string[];
}

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

    const body = await request.json();
    const { message, conversationHistory, currentResumeData } = body as {
      message: string;
      conversationHistory?: { role: string; content: string }[];
      currentResumeData?: ResumeData | null;
    };

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // ── Build the system prompt with current state ──
    // This is the KEY to making Tedo smart: it always knows what's
    // already been collected, so it never asks for info again and
    // never forgets what was said 5 messages ago.
    const currentDataJson = currentResumeData
      ? JSON.stringify(currentResumeData, null, 2)
      : '{"contact":{"fullName":"","phone":"","email":"","address":""},"summary":"","experience":[],"education":[],"certifications":[],"skills":[]}';

    const systemPrompt = `You are Tedo, an expert AI resume writer for healthcare professionals. You build resumes through natural conversation.

## WHAT YOU ALREADY KNOW (current resume data)
Here is the resume data you've collected so far. UPDATE this based on the candidate's latest message — do NOT lose any existing data:

${currentDataJson}

## YOUR RULES

1. NEVER ask for info that's already in the data above. If fullName is filled, don't ask for their name. If experience has entries, don't ask where they work.

2. If the candidate pastes a large block of text (their resume, LinkedIn profile), extract EVERYTHING from it in ONE response. Parse all jobs, education, skills, certifications, and write a professional summary. Don't ask them to repeat anything.

3. WRITE the professional summary yourself when you have name + 1 job + skills. Don't say "I'll draft it" — actually include it in resumeData.summary.

4. Every response must include the COMPLETE updated resumeData — merge what you already know (above) with any new info from this message. Never lose existing data.

5. If the candidate says "hi" or "hello", greet them warmly and ask your first question. Don't treat greetings as answers.

6. Keep your conversational reply SHORT (2-3 sentences). Be warm, use their name, acknowledge what they shared, then ask the NEXT question (or tell them the resume is ready).

7. For experience descriptions, write professional bullet points with action verbs. For skills, use short strings. Write the summary in third person.

## CONVERSATION FLOW (follow when starting from scratch)
1. Name + role → 2. Contact → 3. Current job → 4. Previous jobs → 5. Education → 6. Certifications → 7. Skills → 8. Write summary → 9. Complete

## COMPLETION
Set isComplete=true ONLY when you have: fullName, email or phone, 1+ experience with facility, education or 2+ skills, and a summary.

## RESPONSE FORMAT
Return ONLY valid JSON (no markdown, no code fences):

{
  "reply": "Your 2-3 sentence conversational response (what the candidate sees in chat — NO JSON, NO code)",
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

The resumeData must be the COMPLETE merged data — everything from "WHAT YOU ALREADY KNOW" plus any new info from this message.`;

    // Build conversation messages — only include the last 6 messages
    // (older context is captured in the current data state)
    const recentHistory = (conversationHistory || []).slice(-6);

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await aiChatCompletion({
      messages,
      temperature: 0.3,
      max_tokens: 2500,
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || "";

    // ── Robust JSON extraction ──
    let jsonStr = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // If there's text before the JSON, find the first { and last }
    if (!jsonStr.startsWith("{")) {
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      // If JSON parse fails, return a clean message — never show raw JSON
      let cleanReply = rawResponse
        .replace(/```json\s*/i, "")
        .replace(/```\s*/i, "")
        .replace(/\{[\s\S]*\}/g, "")
        .trim();

      return NextResponse.json({
        reply: cleanReply || "I'm having trouble processing that. Could you try again?",
        resumeData: currentResumeData, // Return existing data so nothing is lost
        isComplete: false,
      });
    }

    // ── Validate + sanitize ──
    if (typeof result.reply !== "string") {
      result.reply = "Could you tell me more about that?";
    }

    // Strip any JSON that leaked into the reply
    result.reply = result.reply
      .replace(/\{[\s\S]*\}/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    // Ensure resumeData structure
    if (!result.resumeData) {
      result.resumeData = currentResumeData; // Don't lose existing data
    } else {
      const rd = result.resumeData;
      rd.experience = Array.isArray(rd.experience) ? rd.experience : (currentResumeData?.experience || []);
      rd.education = Array.isArray(rd.education) ? rd.education : (currentResumeData?.education || []);
      rd.certifications = Array.isArray(rd.certifications) ? rd.certifications : (currentResumeData?.certifications || []);
      rd.skills = Array.isArray(rd.skills) ? rd.skills : (currentResumeData?.skills || []);
      rd.contact = rd.contact || currentResumeData?.contact || { fullName: "", phone: "", email: "", address: "" };
      rd.summary = rd.summary || currentResumeData?.summary || "";
    }

    result.isComplete = !!result.isComplete;

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TEDO_CHAT]", error);
    return NextResponse.json(
      { error: "Tedo is having trouble responding. Please try again." },
      { status: 500 }
    );
  }
}
