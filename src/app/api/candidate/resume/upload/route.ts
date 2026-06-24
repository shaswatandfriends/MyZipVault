import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

// POST /api/candidate/resume/upload
// Uploads a resume file (PDF or Word) to Supabase Storage, parses it
// with Affinda if available, and creates/updates the Resume record.
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

    const body = await request.json();
    const { file_base64, file_name } = body;

    if (!file_base64 || !file_name) {
      return NextResponse.json(
        { error: "File data and file name are required" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const buffer = Buffer.from(file_base64, "base64");
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileExtension = file_name.toLowerCase().slice(file_name.lastIndexOf("."));
    const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Detect MIME type
    const detectMimeType = (buf: Buffer): string => {
      if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
      if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return "application/msword";
      if (buf[0] === 0x50 && buf[1] === 0x4B) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      return "application/octet-stream";
    };

    const mimeType = detectMimeType(buffer);

    // Upload to Supabase Storage
    const { v4: uuidv4 } = await import("uuid");
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const uploadResult = await uploadFile(
      "resumes",
      `candidate-${userId}`,
      buffer,
      uniqueFileName,
      mimeType
    );

    const fileUrl = uploadResult.url;

    // Try to parse with Affinda if available
    let parsedData = null;
    try {
      const { isAffindaConfigured, parseResume } = await import("@/lib/affinda");
      if (isAffindaConfigured()) {
        parsedData = await parseResume(buffer, file_name);
        console.log("[RESUME_UPLOAD] Affinda parsing completed");
      }
    } catch (parseErr) {
      console.warn("[RESUME_UPLOAD] Affinda parsing failed, continuing without parsed data:", parseErr);
    }

    // Create or update resume record
    const existing = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    let resume;
    if (existing) {
      resume = await db.resume.update({
        where: { id: existing.id },
        data: {
          file_url: fileUrl,
          is_builder_resume: false,
          parsed_data: parsedData ? JSON.stringify(parsedData) : existing.parsed_data,
        },
      });
    } else {
      resume = await db.resume.create({
        data: {
          candidate_user_id: userId,
          file_url: fileUrl,
          is_builder_resume: false,
          parsed_data: parsedData ? JSON.stringify(parsedData) : null,
        },
      });
    }

    // Update candidate profile
    await db.candidateProfile.update({
      where: { user_id: userId },
      data: { resume_id: resume.id },
    }).catch(() => {});

    return NextResponse.json({
      resume: {
        id: resume.id,
        fileUrl: resume.file_url,
        isBuilderResume: resume.is_builder_resume,
        parsedData: parsedData,
        createdAt: resume.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[RESUME_UPLOAD_POST]", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
      { status: 500 }
    );
  }
}
