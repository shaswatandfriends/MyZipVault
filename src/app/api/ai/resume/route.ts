import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, context, section, currentContent } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // Initialize the AI SDK
    const zai = await ZAI.create();

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

      case "suggest_skills": {
        systemPrompt = `You are a healthcare staffing expert. Based on the provided context, suggest relevant healthcare skills that the candidate should include in their resume. Return a JSON array of objects with "skill" (string) and "proficiency" (one of: Beginner, Intermediate, Advanced, Expert) fields. Return ONLY the JSON array, no additional text.`;
        userPrompt = context
          ? `Suggest healthcare skills for this professional:\n\n${JSON.stringify(context, null, 2)}`
          : "Suggest common healthcare skills for an experienced nurse or healthcare professional.";
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

      case "chat": {
        systemPrompt = `You are an AI resume assistant for MyZipVault, a healthcare staffing compliance platform. You help candidates improve their resumes, suggest content, and answer questions about resume best practices for healthcare positions. Be helpful, concise, and professional. If asked about something unrelated to resumes or healthcare careers, politely redirect. Format your responses clearly with bullet points or paragraphs as appropriate.`;
        userPrompt = currentContent || "How can you help me with my resume?";
        break;
      }

      default: {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = completion.choices?.[0]?.message?.content || "";

    // For actions that return structured data, try to parse JSON
    if (["suggest_skills", "suggest_certifications", "generate_full_resume"].includes(action)) {
      try {
        // Try to extract JSON from the response (may be wrapped in markdown code blocks)
        const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
        const jsonStr = jsonMatch[1].trim();
        const parsed = JSON.parse(jsonStr);
        return NextResponse.json({ result: parsed, raw: result });
      } catch {
        // If parsing fails, return raw text
        return NextResponse.json({ result: null, raw: result });
      }
    }

    return NextResponse.json({ result, raw: result });
  } catch (error) {
    console.error("[AI_RESUME] Error:", error);
    return NextResponse.json(
      { error: "AI assistance unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
