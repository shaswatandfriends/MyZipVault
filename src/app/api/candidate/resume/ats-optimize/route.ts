import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiChatCompletion } from "@/lib/ai-unified";

/**
 * POST /api/candidate/resume/ats-optimize
 *
 * Takes a parsed resume and rewrites it to be more ATS-friendly.
 * Does NOT change the meaning or add fake experience — just improves
 * wording, keywords, and formatting suggestions.
 *
 * Body: { resumeId: number }
 * Returns: { optimizedData: <same schema as parsed_data>, changes: string[] }
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

    const userId = Number((session.user as Record<string, unknown>).id);
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
        { error: "Resume must be parsed first." },
        { status: 400 }
      );
    }

    const resumeData = JSON.parse(resume.parsed_data);

    const systemPrompt = `You are an expert ATS resume optimizer for healthcare professionals. Rewrite the given resume data to maximize ATS compatibility while keeping all information truthful.

Improvements to make:
- Strengthen the professional summary with healthcare keywords
- Add quantifiable metrics where contextually appropriate (e.g., "cared for 8-12 patients per shift")
- Improve action verbs in experience descriptions
- Ensure skills section includes standard healthcare terms
- Standardize date formats to "YYYY-MM"
- Keep the SAME schema — do not add or remove fields

Return ONLY valid JSON:
{
  "optimizedData": <same schema as input>,
  "changes": ["Improved summary with 5 keywords", "Added metrics to 3 experience entries", "Standardized all dates to YYYY-MM"]
}

Do NOT invent experience, certifications, or education. Only enhance existing content.
Return ONLY the JSON.`;

    const completion = await aiChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(resumeData).slice(0, 6000) },
      ],
      temperature: 0.3,
      max_tokens: 2500,
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

    // Save the optimized version back to the resume
    await db.resume.update({
      where: { id: resumeId },
      data: { parsed_data: JSON.stringify(result.optimizedData) },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ATS_OPTIMIZE]", error);
    return NextResponse.json(
      { error: "Failed to optimize resume" },
      { status: 500 }
    );
  }
}
