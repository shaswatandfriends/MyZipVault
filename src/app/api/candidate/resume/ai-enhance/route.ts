import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createZAI } from "@/lib/zai";

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
    const { section, content } = body;

    if (!section || !content) {
      return NextResponse.json(
        { error: "Section and content are required" },
        { status: 400 }
      );
    }

    const zai = await createZAI();

    const systemPrompt = `You are a professional resume writer specializing in healthcare resumes. Enhance the given resume section to be more professional, impactful, and ATS-friendly. Keep the content truthful but improve wording, add relevant healthcare terminology, and make it more compelling. Return ONLY the enhanced text, no explanations or formatting markers.`;

    const userPrompt =
      section === "summary"
        ? `Enhance this professional summary for a healthcare resume:\n\n${content}`
        : `Enhance this ${section} section for a healthcare resume:\n\n${content}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const enhancedContent = completion.choices[0]?.message?.content?.trim();

    if (!enhancedContent) {
      return NextResponse.json(
        { error: "AI enhancement failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ enhancedContent });
  } catch (error) {
    console.error("AI enhance error:", error);
    return NextResponse.json(
      { error: "Failed to enhance content" },
      { status: 500 }
    );
  }
}
