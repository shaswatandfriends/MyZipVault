import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, STORAGE_BUCKETS } from "@/lib/storage";
import { aiChatCompletion } from "@/lib/ai-unified";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/candidate/resume/upload
 *
 * Upload a resume file (PDF/DOC/DOCX), extract text, parse with AI,
 * and save both the file URL and parsed data to the database.
 *
 * Accepts multipart/form-data with a "file" field.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate extension
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = safeFileName.toLowerCase().slice(safeFileName.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadFile(
      STORAGE_BUCKETS.RESUMES,
      `candidate-${userId}`,
      buffer,
      safeFileName,
      file.type || "application/octet-stream"
    );

    // Create resume row
    const resume = await db.resume.create({
      data: {
        candidate_user_id: userId,
        file_url: uploadResult.url,
        is_builder_resume: false,
      },
    });

    // Try to extract + parse text with AI (non-blocking — if it fails,
    // the resume is still uploaded, user can parse later)
    let parsedData: unknown = null;
    try {
      // Extract text based on file type
      let rawText = "";

      if (ext === ".pdf") {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse(new Uint8Array(buffer));
        const result = await parser.getText();
        rawText = result.text || "";
      } else if (ext === ".docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } else {
        rawText = buffer.toString("utf-8");
      }

      if (rawText.trim().length >= 10) {
        // Clean up text (fix spaced letters from PDF extraction)
        let prevText: string;
        do {
          prevText = rawText;
          rawText = rawText.replace(/([A-Z])\s([A-Z])(?=\s|[^\w])/g, "$1$2");
        } while (rawText !== prevText);
        rawText = rawText.replace(/ {2,}/g, " ").trim();

        // Parse with AI
        const systemPrompt = `You are an expert resume parser. Extract structured data from the raw resume text. Return ONLY valid JSON matching this schema:

{
  "contact": { "fullName": "", "phone": "", "email": "", "address": "" },
  "summary": "",
  "experience": [{ "facility": "", "unit": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "school": "", "degree": "", "graduationYear": "" }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "skills": [""]
}

Use empty strings for missing fields. Include ALL experience entries. Return ONLY the JSON.`;

        const completion = await aiChatCompletion({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: rawText.slice(0, 8000) },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        });

        const rawResponse = completion.choices[0]?.message?.content?.trim() || "";
        const jsonStr = rawResponse
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        parsedData = JSON.parse(jsonStr);

        // Save parsed data to the resume
        await db.resume.update({
          where: { id: resume.id },
          data: { parsed_data: JSON.stringify(parsedData) },
        });
      }
    } catch (parseError) {
      console.error("[RESUME_UPLOAD] Auto-parse failed (non-blocking):", parseError);
      // Don't fail the upload — user can parse later via the Parse button
    }

    return NextResponse.json(
      {
        resume: {
          id: resume.id,
          fileUrl: resume.file_url,
          isBuilderResume: resume.is_builder_resume,
          createdAt: resume.created_at,
          parsedData,
        },
        message: parsedData
          ? "Resume uploaded and parsed successfully!"
          : "Resume uploaded. Click 'Parse with AI' to extract data.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[RESUME_UPLOAD]", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
      { status: 500 }
    );
  }
}
