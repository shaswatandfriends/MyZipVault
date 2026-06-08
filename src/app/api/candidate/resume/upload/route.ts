import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, STORAGE_BUCKETS } from "@/lib/storage";
import ZAI from "z-ai-web-dev-sdk";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Uses AI to parse resume text content into structured data.
 * Falls back gracefully if AI parsing fails.
 */
async function parseResumeWithAI(file: File): Promise<Record<string, unknown> | null> {
  try {
    const zai = await ZAI.create();

    // Read the file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const mimeType = file.type || "application/octet-stream";

    const completion = await zai.chat.completions.createVision({
      messages: [
        {
          role: "system",
          content: `You are a professional resume parser specializing in healthcare resumes. Extract ALL information from this resume and return it as a JSON object with exactly this structure. Be thorough — extract every detail you can find:

{
  "contact": {
    "fullName": "",
    "phone": "",
    "email": "",
    "address": ""
  },
  "summary": "",
  "experience": [
    {
      "facility": "",
      "unit": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "year": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuingOrg": "",
      "year": ""
    }
  ],
  "skills": [
    {
      "skill": "",
      "proficiency": "Intermediate"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, no code blocks. If a field is not found, leave it as an empty string or empty array. For experience descriptions, include key responsibilities and achievements. For skills, infer proficiency as Beginner/Intermediate/Advanced/Expert based on years of experience mentioned.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Parse this resume and extract all information into the structured JSON format. Be thorough and capture every detail.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const rawContent = completion.choices[0]?.message?.content?.trim();
    if (!rawContent) return null;

    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate it has the expected structure
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }

    return null;
  } catch (error) {
    console.error("[RESUME_UPLOAD] AI parsing failed:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // ── 1. Auth & role check ──────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── 2. Parse FormData & validate file presence ────────────────────
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Please upload a resume file." },
        { status: 400 }
      );
    }

    // ── 3. Validate MIME type ─────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      // Also check by extension as a fallback (some browsers report empty MIME)
      const originalName = file.name.toLowerCase();
      const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
        originalName.endsWith(ext)
      );
      if (!hasValidExtension) {
        return NextResponse.json(
          { error: "Invalid file type. Only PDF, DOC, and DOCX files are accepted." },
          { status: 400 }
        );
      }
    }

    // ── 4. Validate file size ─────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 10 MB limit. Please upload a smaller file." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty. Please select a valid resume file." },
        { status: 400 }
      );
    }

    // ── 5. Upload file to storage ─────────────────────────────────────
    const folder = `user-${userId}`;
    const { url: fileUrl } = await uploadFile(
      STORAGE_BUCKETS.RESUMES,
      folder,
      file,
      file.name,
      file.type
    );

    // ── 6. AI-parse the resume content ────────────────────────────────
    let parsedData: Record<string, unknown> | null = null;
    try {
      parsedData = await parseResumeWithAI(file);
    } catch {
      // Non-blocking — the file is still uploaded even if parsing fails
      console.warn("[RESUME_UPLOAD] AI parsing skipped due to error");
    }

    // ── 7. Create or update the resume record ─────────────────────────
    const existingResume = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    let resume;

    if (existingResume) {
      // Replace the existing resume file_url and parsed data
      resume = await db.resume.update({
        where: { id: existingResume.id },
        data: {
          file_url: fileUrl,
          is_builder_resume: false,
          parsed_data: parsedData ? JSON.stringify(parsedData) : existingResume.parsed_data,
        },
      });
    } else {
      // Create a new resume record
      resume = await db.resume.create({
        data: {
          candidate_user_id: userId,
          file_url: fileUrl,
          is_builder_resume: false,
          parsed_data: parsedData ? JSON.stringify(parsedData) : null,
        },
      });

      // ── 8. Link to CandidateProfile if one exists ───────────────────
      const profile = await db.candidateProfile.findUnique({
        where: { user_id: userId },
      });
      if (profile) {
        await db.candidateProfile.update({
          where: { user_id: userId },
          data: { resume_id: resume.id },
        });
      }
    }

    // ── 9. Also link if we updated an existing resume and the profile
    //       doesn't reference it yet (edge-case safety net) ────────────
    if (existingResume) {
      const profile = await db.candidateProfile.findUnique({
        where: { user_id: userId },
      });
      if (profile && profile.resume_id !== existingResume.id) {
        await db.candidateProfile.update({
          where: { user_id: userId },
          data: { resume_id: existingResume.id },
        });
      }
    }

    // ── 10. Return the resume record ───────────────────────────────────
    return NextResponse.json({
      resume: {
        id: resume.id,
        fileUrl: resume.file_url,
        isBuilderResume: resume.is_builder_resume,
        createdAt: resume.created_at,
        parsedData: parsedData,
      },
      parsed: !!parsedData,
    });
  } catch (error) {
    console.error("[RESUME UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload resume. Please try again later." },
      { status: 500 }
    );
  }
}
