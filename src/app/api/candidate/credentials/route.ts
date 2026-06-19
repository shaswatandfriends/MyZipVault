import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const credentials = await db.credential.findMany({
      where: { candidate_user_id: userId },
      orderBy: { uploaded_at: "desc" },
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error("[CANDIDATE_CREDENTIALS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { document_name, file_base64, file_name, expiration_date, reminder_enabled } = body;

    if (!document_name || !file_base64) {
      return NextResponse.json(
        { error: "Document name and file are required" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const buffer = Buffer.from(file_base64, "base64");
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type by checking magic bytes / MIME type
    const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".doc", ".docx"];
    const ALLOWED_MIME_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    // Sanitize and validate filename
    const safeFileName = (file_name || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileExtension = safeFileName.toLowerCase().slice(safeFileName.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Detect MIME type from magic bytes
    const detectMimeType = (buf: Buffer): string | null => {
      if (buf.length < 4) return null;
      // PDF: starts with %PDF
      if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
      // JPEG: starts with FF D8 FF
      if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
      // PNG: starts with 89 50 4E 47
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
      // GIF: starts with GIF8
      if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
      // WebP: RIFF....WEBP
      if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
          buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
      // DOC: D0 CF 11 E0 (OLE2)
      if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return "application/msword";
      // DOCX: PK (ZIP archive)
      if (buf[0] === 0x50 && buf[1] === 0x4B) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      return null;
    };

    const detectedMime = detectMimeType(buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return NextResponse.json(
        { error: "Invalid file content detected. Only PDF, images, and Word documents are allowed." },
        { status: 400 }
      );
    }

    // Save file with sanitized name using UUID to prevent path traversal
    const { v4: uuidv4 } = await import("uuid");
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const uploadDir = path.join(process.cwd(), "public", "upload", "credentials");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, uniqueFileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/upload/credentials/${uniqueFileName}`;

    // Create credential record
    const credential = await db.credential.create({
      data: {
        candidate_user_id: userId,
        document_name,
        file_url: fileUrl,
        expiration_date: expiration_date ? new Date(expiration_date) : null,
        reminder_enabled: reminder_enabled ?? false,
        status: "active",
        verification_status: "pending_review",
      },
    });

    // ─── BOB status engine hook (non-blocking) ────────────────────
    // If this candidate is linked to a recruiter lead, log a "doc_uploaded"
    // activity so the recruiter's timeline shows the upload.
    try {
      const { findLeadByCandidateUserId } = await import("@/lib/bob/lead-finder");
      const { onDocUploaded } = await import("@/lib/bob/status-engine");
      const lead = await findLeadByCandidateUserId(userId);
      if (lead) {
        await onDocUploaded({
          leadId: lead.id,
          docType: document_name,
          docName: document_name,
        });
        console.log(`[BOB HOOK] onDocUploaded fired for lead ${lead.id}, doc: ${document_name}`);
      }
    } catch (bobErr) {
      console.error("[BOB HOOK] Failed to fire doc-uploaded hook:", bobErr);
      // Non-blocking — credential was already saved
    }

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    console.error("[CANDIDATE_CREDENTIALS_POST]", error);
    return NextResponse.json(
      { error: "Failed to upload credential" },
      { status: 500 }
    );
  }
}
