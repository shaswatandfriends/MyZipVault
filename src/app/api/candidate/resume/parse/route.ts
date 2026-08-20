import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiChatCompletion } from "@/lib/ai-unified";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase";

/**
 * POST /api/candidate/resume/parse
 *
 * Fetches the resume file from Supabase Storage, extracts text using
 * pdf-parse (PDF) or mammoth (DOCX), then uses AI (Groq primary, ZAI
 * fallback) to parse the text into structured JSON.
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
    console.log("[RESUME_PARSE] Step 1: Fetching file. URL starts with:", resume.file_url.slice(0, 50));

    if (resume.file_url.startsWith("data:")) {
      console.log("[RESUME_PARSE] File is base64 data URL");
      const base64 = resume.file_url.split(",")[1];
      fileBuffer = Buffer.from(base64, "base64");
    } else if (isSupabaseAdminConfigured()) {
      console.log("[RESUME_PARSE] Downloading from Supabase Storage");
      const supabase = getSupabaseAdmin();
      const bucket = "resumes";
      const urlParts = resume.file_url.split(`/${bucket}/`);
      const storagePath = urlParts.length > 1 ? urlParts[1] : resume.file_url;
      console.log("[RESUME_PARSE] Storage path:", storagePath);

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(storagePath);

      if (error || !data) {
        console.error("[RESUME_PARSE] Supabase download failed:", error);
        return NextResponse.json(
          { error: `Failed to download resume file: ${error?.message || "Unknown error"}` },
          { status: 500 }
        );
      }

      const arrayBuffer = await data.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      console.log("[RESUME_PARSE] File downloaded, size:", fileBuffer.length, "bytes");
    } else {
      console.log("[RESUME_PARSE] Fetching URL directly");
      const fileRes = await fetch(resume.file_url);
      if (!fileRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch resume file: HTTP ${fileRes.status}` },
          { status: 500 }
        );
      }
      const arrayBuffer = await fileRes.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    // ── Step 2: Extract text based on file type ──
    console.log("[RESUME_PARSE] Step 2: Extracting text");
    const lowerUrl = resume.file_url.toLowerCase();
    let rawText = "";

    if (lowerUrl.includes(".pdf") || lowerUrl.startsWith("data:application/pdf")) {
      console.log("[RESUME_PARSE] Detected PDF, extracting with pdf-parse");
      rawText = await extractTextFromPDF(fileBuffer);
    } else if (lowerUrl.includes(".docx")) {
      console.log("[RESUME_PARSE] Detected DOCX, extracting with mammoth");
      rawText = await extractTextFromDOCX(fileBuffer);
    } else if (lowerUrl.includes(".doc")) {
      return NextResponse.json(
        {
          error:
            "Legacy .doc format is not supported. Please convert your resume to .pdf or .docx and re-upload.",
        },
        { status: 400 }
      );
    } else {
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

    // ── Step 2b: Clean up extracted text ──
    console.log("[RESUME_PARSE] Step 2b: Cleaning text. Length:", rawText.length);

    // Fix single-letter-spaced words (e.g., "S W A T I" → "SWATI")
    let prevText: string;
    do {
      prevText = rawText;
      rawText = rawText.replace(/([A-Z])\s([A-Z])(?=\s|[^\w])/g, "$1$2");
    } while (rawText !== prevText);

    // Second pass: merge remaining pairs like "SW AT" → "SWAT"
    do {
      prevText = rawText;
      rawText = rawText.replace(/([A-Z]{2,})\s([A-Z]{2,})(?=\s|[^\w])/g, (match, p1, p2) => {
        if ((p1 + p2).length <= 15) return p1 + p2;
        return match;
      });
    } while (rawText !== prevText);

    rawText = rawText
      .replace(/ {2,}/g, " ")
      .replace(/\s+,/g, ",")
      .replace(/\s+\./g, ".")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // ── Step 3: AI parse (Groq primary, ZAI fallback) ──
    console.log("[RESUME_PARSE] Step 3: Calling AI. Text length:", rawText.length);

    const systemPrompt = `You are an expert resume parser. Extract structured data from the raw resume text. This could be a nurse, doctor, healthcare recruiter, or any healthcare professional's resume.

Return ONLY valid JSON (no markdown, no explanations) matching this exact schema:

{
  "contact": { "fullName": "", "phone": "", "email": "", "address": "" },
  "summary": "",
  "experience": [{ "facility": "", "unit": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "school": "", "degree": "", "graduationYear": "" }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "skills": [""]
}

Critical extraction rules:
- Contact: Look for name at the top of the resume, email (contains @), phone (numbers with dashes/spaces), and address/location.
- Summary: This might be labeled "Profile", "Summary", "Objective", or "About". Extract the full text.
- Experience: Look for job titles + company names + dates. Map company → "facility", department/specialty → "unit". Include ALL jobs found.
- Education: Look for school/university names, degrees, and graduation years.
- Certifications: Look for any certifications, licenses, or training. If none found, return empty array [].
- Skills: Extract ALL skills mentioned. Return as array of short strings.

IMPORTANT:
- Use empty strings for missing fields, never null.
- For dates use "YYYY-MM" if parseable, otherwise the original text.
- Do NOT leave fields empty if the information is present in the text.
- Return ONLY the JSON object, no surrounding text or markdown.`;

    const completion = await aiChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText.slice(0, 8000) },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });
    console.log("[RESUME_PARSE] AI response received. Content length:", completion.choices[0]?.message?.content?.length || 0);

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

    console.log("[RESUME_PARSE] Done — saved to DB");
    return NextResponse.json({ parsedData });
  } catch (error) {
    console.error("[RESUME_PARSE]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("No AI provider configured")) {
      return NextResponse.json(
        {
          error:
            "AI service is not configured. Set either GROQ_API_KEY or ZAI_API_KEY in Vercel env vars.",
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes("All AI providers failed")) {
      return NextResponse.json(
        { error: `AI services are temporarily unavailable: ${errorMessage}` },
        { status: 502 }
      );
    }

    if (errorMessage.includes("Failed to extract text from PDF")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// ─── Text Extraction Helpers ────────────────────────────────────────

/**
 * Extract text from a PDF Buffer using pdf-parse.
 *
 * pdf-parse wraps pdfjs-dist and handles all worker configuration
 * internally — no GlobalWorkerOptions.workerSrc setup needed, no
 * worker spawning issues on Vercel serverless.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse(new Uint8Array(buffer));
    const result = await parser.getText();
    // result = { pages: [...], text: "...", total: ... }
    return result.text || "";
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
