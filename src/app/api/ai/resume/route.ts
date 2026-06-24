import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiGenerateText, getAIProviderStatus } from "@/lib/ai-provider";
import { isAffindaConfigured, suggestSkills as affindaSuggestSkills } from "@/lib/affinda";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized — please log in again" }, { status: 401 });
    }

    const body = await request.json();
    const { action, context, section, currentContent } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // ── Affinda-backed actions (resume parsing — always works) ────────
    if (action === "suggest_skills") {
      if (isAffindaConfigured()) {
        try {
          const existingSkills = context?.skills?.map((s: { skill: string }) => s.skill) || [];
          const affindaSuggestions = await affindaSuggestSkills(existingSkills);
          if (affindaSuggestions.length > 0) {
            return NextResponse.json({
              result: affindaSuggestions.map((skill) => ({
                skill,
                proficiency: "Intermediate",
              })),
              source: "affinda",
            });
          }
        } catch (err) {
          console.warn("[AI_RESUME] Affinda skill suggestion failed, trying AI:", err);
        }
      }

      // Fallback to AI provider (Groq → Gemini → GLM)
      const result = await aiGenerateText({
        systemPrompt: `You are a healthcare staffing expert. Based on the provided context, suggest relevant healthcare skills that the candidate should include in their resume. Return a JSON array of objects with "skill" (string) and "proficiency" (one of: Beginner, Intermediate, Advanced, Expert) fields. Return ONLY the JSON array, no additional text.`,
        userPrompt: context
          ? `Suggest healthcare skills for this professional:\n\n${JSON.stringify(context, null, 2)}`
          : "Suggest common healthcare skills for an experienced nurse or healthcare professional.",
        temperature: 0.7,
        maxTokens: 2000,
      });

      try {
        const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result.content];
        const parsed = JSON.parse(jsonMatch[1].trim());
        return NextResponse.json({ result: parsed, raw: result.content, source: result.provider });
      } catch {
        return NextResponse.json({ result: null, raw: result.content, source: result.provider });
      }
    }

    // ── AI-backed actions (using triple-provider system) ──────────────
    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "generate_summary": {
        systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Write a compelling professional summary for a healthcare professional's resume. The summary should be concise (2-4 sentences), highlight key qualifications, and be tailored to healthcare positions. Return ONLY the summary text, no additional commentary.`;
        userPrompt = context
          ? `Generate a professional summary based on this information:\n\n${JSON.stringify(context, null, 2)}`
          : "Generate a professional summary for an experienced healthcare professional (nurse/therapist/technician).";
        break;
      }

      case "improve_summary": {
        systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Improve and enhance the given professional summary to make it more compelling, impactful, and tailored for healthcare positions. Keep it concise (2-4 sentences). Return ONLY the improved summary text, no additional commentary.`;
        userPrompt = `Improve this professional summary:\n\n"${currentContent}"`;
        break;
      }

      case "improve_experience": {
        systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Improve and enhance the given work experience description to make it more impactful, using strong action verbs and quantifiable achievements where possible. Tailor it for healthcare positions. Return ONLY the improved description text, no additional commentary.`;
        userPrompt = `Improve this work experience description for a healthcare position:\n\n"${currentContent}"\n\nContext: ${context ? JSON.stringify(context) : "Healthcare professional"}`;
        break;
      }

      case "suggest_certifications": {
        systemPrompt = `You are a healthcare staffing expert. Based on the provided context, suggest relevant healthcare certifications that the candidate should pursue or include in their resume. Return a JSON array of objects with "name" (string), "issuingOrg" (string), and "year" (string) fields. Return ONLY the JSON array, no additional text.`;
        userPrompt = context
          ? `Suggest healthcare certifications for this professional:\n\n${JSON.stringify(context, null, 2)}`
          : "Suggest common healthcare certifications for an experienced nurse or healthcare professional.";
        break;
      }

      case "generate_full_resume": {
        systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Generate complete resume data based on the provided information. Return a JSON object with this exact structure:
{
  "contact": { "fullName": "", "phone": "", "email": "", "address": "" },
  "summary": "",
  "experience": [{ "facility": "", "unit": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "school": "", "degree": "", "year": "" }],
  "certifications": [{ "name": "", "issuingOrg": "", "year": "" }],
  "skills": [{ "skill": "", "proficiency": "Intermediate" }]
}
Return ONLY valid JSON, no additional text or markdown.`;
        userPrompt = `Generate a complete healthcare resume based on this information:\n\n${JSON.stringify(context, null, 2)}`;
        break;
      }

      case "ats_score": {
        systemPrompt = `You are an ATS (Applicant Tracking System) expert. Analyze the provided resume data and job description. Return a JSON object with:
{
  "score": <number 0-100>,
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2"]
}
Return ONLY valid JSON.`;
        userPrompt = `Analyze this resume against this job description:\n\nResume:\n${JSON.stringify(context?.resume, null, 2)}\n\nJob Description:\n${context?.jobDescription || "No job description provided"}`;
        break;
      }

      case "tailor_resume": {
        systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Create a tailored version of the resume for the specific job description provided. Modify the summary, experience descriptions, and skills to match the job requirements. Return a JSON object with the same structure as the input resume data. Return ONLY valid JSON.`;
        userPrompt = `Tailor this resume for the job description:\n\nResume:\n${JSON.stringify(context?.resume, null, 2)}\n\nJob Description:\n${context?.jobDescription}`;
        break;
      }

      case "chat": {
        systemPrompt = `You are an AI resume assistant for MyZipVault, a healthcare staffing compliance platform. You help candidates improve their resumes, suggest content, and answer questions about resume best practices for healthcare positions. Be helpful, concise, and professional. If asked about something unrelated to resumes or healthcare careers, politely redirect. Format your responses clearly with bullet points or paragraphs as appropriate.`;
        userPrompt = currentContent || "How can you help me with my resume?";
        if (context) {
          userPrompt += `\n\nCandidate's current resume data for context:\n${JSON.stringify(context, null, 2)}`;
        }
        break;
      }

      default: {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    }

    // Call the triple-provider AI system (Groq → Gemini → GLM)
    let result;
    try {
      result = await aiGenerateText({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      });
    } catch (apiErr) {
      console.error("[AI_RESUME] All AI providers failed:", apiErr);
      const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      return NextResponse.json(
        { error: "AI generation failed. All providers unavailable. Please try again later.", details: errMsg },
        { status: 502 }
      );
    }

    if (!result.content) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    // For actions that return structured data, try to parse JSON
    if (["suggest_skills", "suggest_certifications", "generate_full_resume", "ats_score", "tailor_resume"].includes(action)) {
      try {
        const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result.content];
        const parsed = JSON.parse(jsonMatch[1].trim());
        return NextResponse.json({ result: parsed, raw: result.content, provider: result.provider });
      } catch {
        return NextResponse.json({ result: null, raw: result.content, provider: result.provider });
      }
    }

    return NextResponse.json({ result: result.content, raw: result.content, provider: result.provider });
  } catch (error) {
    console.error("[AI_RESUME] Unhandled Error:", error);
    return NextResponse.json(
      { error: "AI assistance unavailable. Please try again later.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET: Check AI provider status
export async function GET() {
  try {
    const status = await getAIProviderStatus();
    return NextResponse.json({
      primary: status.primary,
      providers: {
        groq: status.groqConfigured,
        gemini: status.geminiConfigured,
        glm: status.glmConfigured,
      },
      anyAvailable: status.anyAvailable,
      affinda: isAffindaConfigured(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check AI status" }, { status: 500 });
  }
}
