import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { groqChatCompletion } from "@/lib/groq";
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
    console.log("[RESUME_PARSE] Step 1: Fetching file. URL starts with:", resume.file_url.slice(0, 50));

    if (resume.file_url.startsWith("data:")) {
      // Base64 data URL (fallback when Supabase isn't configured)
      console.log("[RESUME_PARSE] File is base64 data URL");
      const base64 = resume.file_url.split(",")[1];
      fileBuffer = Buffer.from(base64, "base64");
    } else if (isSupabaseAdminConfigured()) {
      // Download from Supabase Storage (server-side, no CORS)
      console.log("[RESUME_PARSE] Downloading from Supabase Storage");
      const supabase = getSupabaseAdmin();
      const bucket = "resumes";

      // Extract storage path from the public URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/resumes/candidate-123/uuid.pdf
      const urlParts = resume.file_url.split(`/${bucket}/`);
      const storagePath = urlParts.length > 1 ? urlParts[1] : resume.file_url;
      console.log("[RESUME_PARSE] Storage path:", storagePath);

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(storagePath);

      if (error || !data) {
        console.error("[RESUME_PARSE] Supabase download failed:", error);
        return NextResponse.json(
          { error: `Failed to download resume file from storage: ${error?.message || "Unknown error"}` },
          { status: 500 }
        );
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      console.log("[RESUME_PARSE] File downloaded, size:", fileBuffer.length, "bytes");
    } else {
      // Fallback: try fetching the URL directly
      console.log("[RESUME_PARSE] Fetching URL directly (no Supabase admin)");
      const fileRes = await fetch(resume.file_url);
      if (!fileRes.ok) {
        console.error("[RESUME_PARSE] Direct fetch failed:", fileRes.status);
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
      console.log("[RESUME_PARSE] Detected PDF, extracting with pdfjs");
      rawText = await extractTextFromPDF(fileBuffer);
    } else if (lowerUrl.includes(".docx")) {
      console.log("[RESUME_PARSE] Detected DOCX, extracting with mammoth");
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

    // ── Step 2b: Clean up extracted text ──
    console.log("[RESUME_PARSE] Step 2b: Cleaning text. Length:", rawText.length);
    // PDF text extraction often produces artifacts:
    //   - Letters with spaces between them: "S W A T I" → "SWATI"
    //   - Multiple consecutive spaces: "name    email" → "name email"
    //   - Line breaks in the middle of words
    // These confuse the AI parser, so we normalize the text first.
    
    // Fix single-letter-spaced words (e.g., "S W A T I" → "SWATI")
    // Must loop because a single regex pass only merges pairs —
    // "S W A T I" → "SW AT I" → "SWAT I" → "SWATI"
    let prevText: string;
    do {
      prevText = rawText;
      rawText = rawText.replace(/([A-Z])\s([A-Z])(?=\s|[^\w])/g, "$1$2");
    } while (rawText !== prevText);

    // Second pass: merge remaining pairs like "SW AT" → "SWAT"
    do {
      prevText = rawText;
      rawText = rawText.replace(/([A-Z]{2,})\s([A-Z]{2,})(?=\s|[^\w])/g, (match, p1, p2) => {
        // Only merge if the combined word looks like a name (not two separate words)
        // Heuristic: if combined length is ≤ 15 chars, merge them
        if ((p1 + p2).length <= 15) return p1 + p2;
        return match;
      });
    } while (rawText !== prevText);

    rawText = rawText
      // Collapse multiple spaces into one
      .replace(/ {2,}/g, " ")
      // Remove spaces before/after common punctuation
      .replace(/\s+,/g, ",")
      .replace(/\s+\./g, ".")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      // Normalize line breaks — collapse 3+ newlines to 2
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // ── Step 3: AI parse ──
    console.log("[RESUME_PARSE] Step 3: Calling AI. Text length:", rawText.length, "GROQ_API_KEY set:", !!process.env.GROQ_API_KEY);
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
- Experience: Look for job titles + company names + dates. Map company → "facility", department/specialty → "unit". Include ALL jobs found. The "description" should include bullet points and responsibilities.
- Education: Look for school/university names, degrees, and graduation years.
- Certifications: Look for any certifications, licenses, or training (BLS, ACLS, RN License, etc.). If none found, return empty array [].
- Skills: Extract ALL skills mentioned (clinical skills, software, languages, etc.). Return as array of short strings. If the resume has a "Skills" section, parse each skill listed there.

IMPORTANT:
- Use empty strings for missing fields, never null.
- For dates use "YYYY-MM" if parseable, otherwise the original text.
- Do NOT leave fields empty if the information is present in the text.
- Look carefully — names might have unusual spacing from PDF extraction.
- Return ONLY the JSON object, no surrounding text or markdown.`;

    console.log("[RESUME_PARSE] Sending request to Groq API...");
    const completion = await groqChatCompletion({
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

    return NextResponse.json({ parsedData });
  } catch (error) {
    console.error("[RESUME_PARSE]", error);

    // Return the actual error message so the user + frontend can see what failed
    // (instead of a generic "Failed to parse resume with AI")
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for common configuration issues
    if (errorMessage.includes("GROQ_API_KEY not configured")) {
      return NextResponse.json(
        {
          error:
            "AI service is not configured. Please contact support to set up the GROQ_API_KEY environment variable.",
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes("Groq API error")) {
      return NextResponse.json(
        {
          error: `AI service error: ${errorMessage}. Please try again in a moment.`,
        },
        { status: 502 }
      );
    }

    if (errorMessage.includes("Failed to extract text from PDF")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 422 }
      );
    }

    if (errorMessage.includes("Failed to extract text from DOCX")) {
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
 * Extract text from a PDF Buffer using pdfjs-dist.
 *
 * CRITICAL: Must set workerSrc to the actual worker file, OR use the
 * getDocument({ disableWorker: true }) option. Setting workerSrc to ""
 * does NOT work — pdfjs still tries to spawn a worker and fails with
 * "Setting up fake worker failed: No GlobalWorkerOptions.workerSrc".
 *
 * The reliable approach in Node.js serverless:
 *   1. Set workerSrc to a valid path (even if we disable the worker)
 *   2. Pass disableWorker: true to getDocument
 *   3. Use the legacy build (no DOM dependencies)
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use legacy build for Node.js compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Set the worker source to the bundled worker file.
    // In Node.js serverless, we can't actually spawn a web worker,
    // but pdfjs requires this to be set before getDocument() is called.
    // The disableWorker option below ensures the worker is never used.
    try {
      const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule;
      pdfjs.GlobalWorkerOptions.workerPort = null;
    } catch {
      // Fallback: set to a dummy URL — disableWorker will prevent it from loading
      pdfjs.GlobalWorkerOptions.workerSrc = "data:application/javascript;base64,";
    }

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      // CRITICAL: disables the worker entirely — runs in main thread
      disableWorker: true,
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
