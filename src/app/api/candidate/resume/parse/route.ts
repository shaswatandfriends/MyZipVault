import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { zaiChatCompletion } from "@/lib/zai";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase";

/**
 * POST /api/candidate/resume/parse
 *
 * Fetches the resume file from Supabase Storage (server-side, no CORS),
 * extracts text using:
 *   - mammoth for .docx files
 *   - pdfjs-dist for .pdf files
 *   - plain text fallback for .txt
 *
 * Then uses AI to parse the extracted text into structured JSON.
 *
 * Body: { resumeId: number }
 * Returns: { parsedData: <structured resume object> }
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
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // Verify the resume belongs to this candidate
    const resume = await db.resume.findFirst({
      where: { id: resumeId, candidate_user_id: userId },
    });
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (!resume.file_url) {
      return NextResponse.json(
        { error: "No file attached to this resume" },
        { status: 400 }
      );
    }

    // ── Step 1: Fetch the file content ──
    let fileBuffer: Buffer;

    if (resume.file_url.startsWith("data:")) {
      // Base64 data URL (fallback when Supabase isn't configured)
      const base64 = resume.file_url.split(",")[1];
      fileBuffer = Buffer.from(base64, "base64");
    } else if (isSupabaseAdminConfigured()) {
      // Download from Supabase Storage (server-side, no CORS)
      const supabase = getSupabaseAdmin();
      const bucket = "resumes";

      // Extract storage path from the public URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/resumes/candidate-123/uuid.pdf
      const urlParts = resume.file_url.split(`/${bucket}/`);
      const storagePath = urlParts.length > 1 ? urlParts[1] : resume.file_url;

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(storagePath);

      if (error || !data) {
        console.error("[RESUME_PARSE] Supabase download failed:", error);
        return NextResponse.json(
          { error: "Failed to download resume file" },
          { status: 500 }
        );
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // Fallback: try fetching the URL directly
      const fileRes = await fetch(resume.file_url);
      if (!fileRes.ok) {
        return NextResponse.json(
          { error: "Failed to fetch resume file" },
          { status: 500 }
        );
      }
      const arrayBuffer = await fileRes.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    // ── Step 2: Extract text based on file type ──
    const lowerUrl = resume.file_url.toLowerCase();
    let rawText = "";

    if (lowerUrl.includes(".pdf") || lowerUrl.startsWith("data:application/pdf")) {
      rawText = await extractTextFromPDF(fileBuffer);
    } else if (lowerUrl.includes(".docx")) {
      rawText = await extractTextFromDOCX(fileBuffer);
    } else if (lowerUrl.includes(".doc")) {
      // Legacy .doc format — mammoth only supports .docx
      return NextResponse.json(
        {
          error:
            "Legacy .doc format is not supported. Please convert your resume to .pdf or .docx and re-upload.",
        },
        { status: 400 }
      );
    } else {
      // Try plain text
      rawText = fileBuffer.toString("utf-8");
    }

    if (rawText.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "Could not extract enough text from the file. If this is a scanned PDF, please upload a text-based PDF or .docx file.",
        },
        { status: 422 }
      );
    }

    // ── Step 3: AI parse ──
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

    // ── Step 4: Save parsed data ──
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

// ─── Text Extraction Helpers ────────────────────────────────────────

/**
 * Extract text from a PDF Buffer using pdfjs-dist.
 * Runs in Node.js with the worker disabled (fake worker mode).
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use legacy build for Node.js compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "";

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      // Disable worker — run in main thread (required for Node.js)
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = content.items.map((item: any) => item.str).join(" ");
      text += pageText + "\n\n";
    }

    return text.trim();
  } catch (error) {
    console.error("[PDF_EXTRACT]", error);
    throw new Error("Failed to extract text from PDF. The file may be corrupted or scanned.");
  }
}

/**
 * Extract text from a DOCX Buffer using mammoth.
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("[DOCX_EXTRACT]", error);
    throw new Error("Failed to extract text from DOCX file.");
  }
}
