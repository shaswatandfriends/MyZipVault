import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { zaiChatCompletion } from "@/lib/zai";

/**
 * POST /api/candidate/resume/parse
 *
 * Takes raw text extracted from an uploaded resume and uses AI to parse
 * it into a structured JSON object.
 */
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
    const { resumeId, rawText } = body as { resumeId?: number; rawText?: string };

    if (!resumeId || !rawText || rawText.trim().length < 10) {
      return NextResponse.json(
        { error: "Resume ID and raw text (min 10 chars) are required" },
        { status: 400 }
      );
    }

    const resume = await db.resume.findFirst({
      where: { id: resumeId, candidate_user_id: userId },
    });
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const systemPrompt = `You are an expert resume parser specializing in healthcare resumes. Extract structured data from the raw resume text. Return ONLY valid JSON (no markdown, no explanations) matching this exact schema:

{
  "contact": { "fullName": "", "phone": "", "email": "", "address": "" },
  "summary": "",
  "experience": [{ "facility": "", "unit": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "school": "", "degree": "", "graduationYear": "" }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "skills": [""]
}

Rules: Use empty strings for missing fields. For dates use "YYYY-MM" if parseable. For "unit" infer the hospital unit (ICU, ER, Med-Surg). Include ALL experience entries. Skills are short strings. Return ONLY the JSON.`;

    const completion = await zaiChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText.slice(0, 8000) },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || "";
    const jsonStr = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 422 }
      );
    }

    await db.resume.update({
      where: { id: resumeId },
      data: { parsed_data: JSON.stringify(parsedData) },
    });

    return NextResponse.json({ parsedData });
  } catch (error) {
    console.error("[RESUME_PARSE]", error);
    return NextResponse.json(
      { error: "Failed to parse resume with AI" },
      { status: 500 }
    );
  }
}
