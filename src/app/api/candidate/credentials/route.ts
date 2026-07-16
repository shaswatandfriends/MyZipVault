import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

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

/**
 * POST /api/candidate/credentials
 *
 * Upload a new credential. Accepts multipart/form-data (preferred for
 * file uploads) with the following fields:
 *   - documentName: string (required) — picked from the certification
 *     dropdown or entered as free text via "Other"
 *   - expirationDate: string (optional, ISO date)
 *   - reminderEnabled: "true" | "false" (optional, defaults to false)
 *   - file: File (required) — the credential document
 *
 * Also accepts application/json with base64-encoded file (legacy path,
 * kept for backwards compatibility with older clients).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // ── Parse request body (FormData or JSON) ──
    let documentName: string;
    let expirationDate: string | null = null;
    let reminderEnabled = false;
    let fileBuffer: Buffer;
    let fileName: string;
    let fileMime: string;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // ── FormData path ──
      const formData = await request.formData();
      documentName = (formData.get("documentName") as string) || "";
      expirationDate = (formData.get("expirationDate") as string) || null;
      reminderEnabled = formData.get("reminderEnabled") === "true";
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "File is required" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      fileMime = file.type;
    } else {
      // ── JSON path (legacy) ──
      const body = await request.json();
      documentName = body.document_name || body.documentName || "";
      const fileBase64 = body.file_base64;
      if (!fileBase64) {
        return NextResponse.json(
          { error: "File is required" },
          { status: 400 }
        );
      }
      fileBuffer = Buffer.from(fileBase64, "base64");
      fileName = body.file_name || "document";
      fileMime = body.file_mime || "application/octet-stream";
      expirationDate = body.expiration_date || null;
      reminderEnabled = body.reminder_enabled ?? false;
    }

    if (!documentName) {
      return NextResponse.json(
        { error: "Document name is required" },
        { status: 400 }
      );
    }

    // ── Duplicate prevention ──
    // A candidate can only have ONE of each certification type.
    // e.g., if they already have "BLS (Basic Life Support)", they can't
    // upload another BLS. They must delete the old one first.
    // Match is case-insensitive on the document_name field.
    const existingCredential = await db.credential.findFirst({
      where: {
        candidate_user_id: userId,
        document_name: {
          equals: documentName,
          mode: "insensitive",
        },
      },
      select: { id: true, document_name: true },
    });

    if (existingCredential) {
      return NextResponse.json(
        {
          error: `You already have "${existingCredential.document_name}" in your vault. Delete the existing one first if you need to upload a new version.`,
        },
        { status: 409 }
      );
    }

    // ── Validate file size (max 10MB) ──
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // ── Validate file extension ──
    const ALLOWED_EXTENSIONS = [
      ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".doc", ".docx",
    ];
    const safeFileName = (fileName || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileExtension = safeFileName.toLowerCase().slice(safeFileName.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Detect MIME from magic bytes (don't trust client) ──
    const detectMimeType = (buf: Buffer): string | null => {
      if (buf.length < 4) return null;
      if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
      if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
      if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
      if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
          buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
      if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return "application/msword";
      if (buf[0] === 0x50 && buf[1] === 0x4B) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      return null;
    };

    const detectedMime = detectMimeType(fileBuffer);
    const ALLOWED_MIME_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return NextResponse.json(
        { error: "Invalid file content. Only PDF, images, and Word docs allowed." },
        { status: 400 }
      );
    }

    // ── Upload to Supabase Storage ──
    const { v4: uuidv4 } = await import("uuid");
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const uploadResult = await uploadFile(
      "credentials",
      `candidate-${userId}`,
      fileBuffer,
      uniqueFileName,
      detectedMime
    );

    const fileUrl = uploadResult.url;

    // ── Create credential record ──
    const credential = await db.credential.create({
      data: {
        candidate_user_id: userId,
        document_name: documentName,
        file_url: fileUrl,
        expiration_date: expirationDate ? new Date(expirationDate) : null,
        reminder_enabled: reminderEnabled,
        status: "active",
        verification_status: "pending_review",
      },
    });

    // ─── BOB status engine hook (non-blocking) ────────────────────
    try {
      const { findLeadByCandidateUserId } = await import("@/lib/bob/lead-finder");
      const { onDocUploaded } = await import("@/lib/bob/status-engine");
      const lead = await findLeadByCandidateUserId(userId);
      if (lead) {
        await onDocUploaded({
          leadId: lead.id,
          docType: documentName,
          docName: documentName,
        });
      }
    } catch (bobErr) {
      console.error("[BOB HOOK] Failed to fire doc-uploaded hook:", bobErr);
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
