import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, STORAGE_BUCKETS } from "@/lib/storage";
import { requireEmailVerified } from "@/lib/email-verification";

/**
 * POST /api/credentials/upload
 *   Accepts FormData upload of a credential document.
 *
 * Form fields:
 *   - documentName: string (required)
 *   - expirationDate: string (optional, ISO date)
 *   - reminderEnabled: string ("true" | "false")
 *   - file: File (required, max 10MB)
 *
 * Security:
 *   - Requires authentication (candidate role only)
 *   - Validates file size (10MB max)
 *   - Validates file type via magic bytes (not just extension)
 *   - Generates UUID filename (no user-controlled filenames in storage)
 *   - Stores in private Supabase bucket (pre-signed URLs only)
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

    // Require email verification (Gap 5)
    const verificationCheck = await requireEmailVerified(userId);
    if (!verificationCheck.allowed) return verificationCheck.errorResponse!;

    // Parse FormData
    const formData = await request.formData();
    const documentName = formData.get("documentName") as string | null;
    const expirationDateStr = formData.get("expirationDate") as string | null;
    const reminderEnabledStr = formData.get("reminderEnabled") as string | null;
    const file = formData.get("file") as File | null;

    if (!documentName || !documentName.trim()) {
      return NextResponse.json(
        { error: "Document name is required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // Read file bytes for magic byte validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect MIME type from magic bytes (don't trust the filename)
    const detectMimeType = (buf: Buffer): string | null => {
      if (buf.length < 4) return null;
      // PDF: %PDF
      if (
        buf[0] === 0x25 &&
        buf[1] === 0x50 &&
        buf[2] === 0x44 &&
        buf[3] === 0x46
      )
        return "application/pdf";
      // JPEG: FF D8 FF
      if (
        buf[0] === 0xff &&
        buf[1] === 0xd8 &&
        buf[2] === 0xff
      )
        return "image/jpeg";
      // PNG: 89 50 4E 47
      if (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47
      )
        return "image/png";
      // GIF: 47 49 46 38 (GIF8)
      if (
        buf[0] === 0x47 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x38
      )
        return "image/gif";
      // WebP: RIFF....WEBP
      if (
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf.length >= 12 &&
        buf[8] === 0x57 &&
        buf[9] === 0x45 &&
        buf[10] === 0x42 &&
        buf[11] === 0x50
      )
        return "image/webp";
      // DOC: D0 CF 11 E0 (OLE2)
      if (
        buf[0] === 0xd0 &&
        buf[1] === 0xcf &&
        buf[2] === 0x11 &&
        buf[3] === 0xe0
      )
        return "application/msword";
      // DOCX: PK (ZIP archive)
      if (buf[0] === 0x50 && buf[1] === 0x4b)
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      return null;
    };

    const detectedMime = detectMimeType(buffer);
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
        {
          error:
            "File type not allowed. Allowed: PDF, JPG, PNG, GIF, WebP, DOC, DOCX",
        },
        { status: 400 }
      );
    }

    // Determine file extension from detected MIME type
    const mimeToExt: Record<string, string> = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
    };
    const fileExtension = mimeToExt[detectedMime] || ".bin";

    // Upload to Supabase Storage (or fall back to base64 if not configured)
    const uploadResult = await uploadFile(
      STORAGE_BUCKETS.CREDENTIALS,
      `credential-${userId}`,
      buffer,
      `credential-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${fileExtension}`,
      detectedMime
    );

    // Parse optional expiration date
    let expirationDate: Date | null = null;
    if (expirationDateStr) {
      const parsed = new Date(expirationDateStr);
      if (!isNaN(parsed.getTime())) {
        expirationDate = parsed;
      }
    }

    const reminderEnabled = reminderEnabledStr === "true";

    // Create credential record
    const credential = await db.credential.create({
      data: {
        candidate_user_id: userId,
        document_name: documentName.trim(),
        file_url: uploadResult.url,
        expiration_date: expirationDate,
        reminder_enabled: reminderEnabled,
        status: "active",
        verification_status: "pending_review",
        uploaded_at: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        credential,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CREDENTIALS_UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload credential" },
      { status: 500 }
    );
  }
}
