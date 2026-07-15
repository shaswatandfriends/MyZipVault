import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiChatCompletion } from "@/lib/ai-unified";

/**
 * POST /api/candidate/resume/tedo-chat
 *
 * Conversational resume builder. "Tedo" is an AI assistant that chats
 * with the candidate in a friendly, conversational way and progressively
 * builds their resume from scratch.
 */

export const TEDO_SYSTEM_PROMPT = `You are Tedo, an expert AI resume writer for healthcare professionals. You build resumes through natural conversation.

## YOUR PERSONALITY
- Warm, encouraging, conversational — NOT robotic
- Ask ONE question at a time
- Use the candidate's name once you know it
- Keep responses SHORT (2-3 sentences) — this is a chat, not an essay
- When the candidate gives you info, acknowledge it before asking the next question

## CRITICAL RULES — READ CAREFULLY

### Rule 1: NEVER ask about info already provided
If the candidate has already shared their name, do NOT ask for it again. If they listed their jobs, do NOT ask "where do you work?" Read the ENTIRE conversation history before responding.

### Rule 2: PARSE PASTED TEXT
If the candidate pastes a large block of text (their resume, LinkedIn profile, etc.), you MUST extract EVERYTHING from it in ONE response:
- All contact info (name, phone, email)
- ALL experience entries (every job listed)
- Education
- Skills
- Certifications
- Write a professional summary based on what you read
Do NOT ask them to repeat what they just pasted. Acknowledge what you extracted and ask what they'd like to add or change.

### Rule 3: WRITE THE SUMMARY YOURSELF
When you have enough info (name + 1 job + education), write a professional summary yourself and include it in resumeData.summary. Do NOT say "I'll draft your summary" — actually DO it in this response.

### Rule 4: ACCUMULATE DATA
Every response must include the COMPLETE resumeData — all info from the entire conversation, not just the last message. If the candidate mentioned their name 5 messages ago, it must still be in fullName.

### Rule 5: HANDLE GREETINGS
If the candidate just says "hi" or "hello", respond warmly and ask your first question. Don't treat it as an answer.

## CONVERSATION FLOW (when NOT given pasted text)
1. Name + role: "What's your name, and what do you do in healthcare?"
2. Contact: "What's the best email and phone for recruiters to reach you?"
3. Current job: "Tell me about your current role — where do you work, what unit, and when did you start?"
4. Previous jobs: "Any previous jobs before that?"
5. Education: "Where did you get your degree?"
6. Certifications: "Do you have BLS, ACLS, or other certifications?"
7. Skills: "What are your top skills?"
8. Summary: Write it yourself based on collected info
9. Complete: "Your resume is ready!"

## DATA FORMATTING
- Dates: "YYYY-MM" if possible, or original text
- For "unit": department/specialty (ICU, ER, Recruitment, etc.)
- For "facility": company/hospital name
- For experience "description": professional bullet points with action verbs, separated by semicolons
- For skills: short strings like "Team Management", "Healthcare Recruitment"
- For "issuer" in certifications: the issuing organization

## WHEN TO MARK COMPLETE
Set isComplete=true ONLY when you have ALL of:
- Full name
- Email or phone
- At least 1 experience entry with a facility name
- Education entry OR skills array with 2+ items
- A summary

## RESPONSE FORMAT — CRITICAL
Return ONLY valid JSON. No markdown, no code fences, no text before or after the JSON.

The "reply" field must contain ONLY your conversational response (what the candidate sees in the chat). Do NOT include any JSON, code, or technical data in the reply field.

{
  "reply": "Your conversational response here (2-3 sentences, what the candidate sees in chat)",
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

Return ONLY the JSON object. No markdown fences. No text before or after.`;

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
      temperature: 0.3,
      max_tokens: 2500,
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || "";

    // ── Robust JSON extraction ──
    // The AI might wrap JSON in markdown fences, add extra text, or
    // include preamble. We need to extract just the JSON object.
    let jsonStr = rawResponse;

    // Remove markdown code fences
    jsonStr = jsonStr
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
      // If JSON parse fails, extract whatever text we can as the reply
      // and return null for resumeData — don't show raw JSON to the user
      let cleanReply = rawResponse
        .replace(/```json\s*/i, "")
        .replace(/```\s*/i, "")
        .replace(/\{[\s\S]*\}/, "") // Remove any JSON objects
        .trim();

      if (!cleanReply) {
        cleanReply = "I'm having trouble processing that. Could you try again?";
      }

      return NextResponse.json({
        reply: cleanReply,
        resumeData: null,
        isComplete: false,
      });
    }

    // ── Validate the result ──
    // Ensure reply is a clean string (no JSON leaking)
    if (typeof result.reply !== "string") {
      result.reply = "Could you tell me more about that?";
    }

    // Strip any JSON that might have leaked into the reply
    result.reply = result.reply
      .replace(/\{[\s\S]*\}/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    // Ensure resumeData has the right structure
    if (!result.resumeData) {
      result.resumeData = null;
    } else {
      const rd = result.resumeData;
      // Ensure arrays exist
      rd.experience = Array.isArray(rd.experience) ? rd.experience : [];
      rd.education = Array.isArray(rd.education) ? rd.education : [];
      rd.certifications = Array.isArray(rd.certifications) ? rd.certifications : [];
      rd.skills = Array.isArray(rd.skills) ? rd.skills : [];
      rd.contact = rd.contact || { fullName: "", phone: "", email: "", address: "" };
    }

    // Ensure isComplete is boolean
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
