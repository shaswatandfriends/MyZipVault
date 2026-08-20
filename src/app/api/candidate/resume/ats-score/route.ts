import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiChatCompletion } from "@/lib/ai-unified";

/**
 * POST /api/candidate/resume/ats-score
 *
 * Analyzes a resume against ATS (Applicant Tracking System) compatibility
 * criteria and returns a score + breakdown.
 *
 * Body: { resumeId: number }
 * Returns: { score: number (0-100), breakdown: { category, score, feedback }[] }
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
    const { resumeId } = body as { resumeId?: number };

    if (!resumeId) {
      return NextResponse.json({ error: "Resume ID is required" }, { status: 400 });
    }

    const resume = await db.resume.findFirst({
      where: { id: resumeId, candidate_user_id: userId },
    });
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (!resume.parsed_data) {
      return NextResponse.json(
        { error: "Resume must be parsed first. Click 'Parse with AI' on your resume." },
        { status: 400 }
      );
    }

    const resumeData = JSON.parse(resume.parsed_data);

    const systemPrompt = `You are an ATS (Applicant Tracking System) resume scanner. Analyze the given resume data and return a compatibility score from 0-100 plus a breakdown.

Return ONLY valid JSON (no markdown):
{
  "score": 85,
  "breakdown": [
    { "category": "Contact Info", "score": 100, "feedback": "All contact fields present" },
    { "category": "Professional Summary", "score": 80, "feedback": "Summary exists but could be more specific" },
    { "category": "Work Experience", "score": 90, "feedback": "Strong experience entries with descriptions" },
    { "category": "Education", "score": 100, "feedback": "Education section complete" },
    { "category": "Skills", "score": 70, "feedback": "Add more healthcare-specific skills" },
    { "category": "Formatting", "score": 85, "feedback": "Good structure, use standard section headings" },
    { "category": "Keywords", "score": 75, "feedback": "Add more job-specific keywords" }
  ],
  "suggestions": ["Add BLS/ACLS to certifications if you have them", "Quantify achievements with numbers"]
}

Categories to evaluate: Contact Info, Professional Summary, Work Experience, Education, Skills, Formatting, Keywords.
Return ONLY the JSON.`;

    const completion = await aiChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(resumeData).slice(0, 6000) },
      ],
      temperature: 0.2,
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
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ATS_SCORE]", error);
    return NextResponse.json(
      { error: "Failed to analyze ATS score" },
      { status: 500 }
    );
  }
}
