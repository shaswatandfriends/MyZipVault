import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadDocument } from "@/lib/vaultsign/supabase-storage";

/**
 * POST /api/vaultsign/documents/upload
 *
 * Upload a file (PDF document OR company logo image) to Supabase storage.
 *
 * Accepts multipart/form-data with a "file" field.
 * Returns: { document_url: string, source_type: "pdf" | "image" }
 *
 * Used by:
 *   - VaultSign "New document" flow (PDF uploads)
 *   - LogoUploader component (PNG/JPG/SVG/WebP logo uploads)
 *
 * File size limits:
 *   - PDF: 25MB
 *   - Image: 5MB
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;
    const role = (session.user as Record<string, unknown>).role as string;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Allow super_admin to specify a target organization ID for the upload folder
    // (used when editing another company's logo from the superadmin companies page)
    let targetOrgId = orgId ?? 0;
    if (role === "super_admin") {
      const explicitOrgId = formData.get("organizationId") as string | null;
      if (explicitOrgId) {
        const parsed = parseInt(explicitOrgId, 10);
        if (!isNaN(parsed)) targetOrgId = parsed;
      }
    }

    // Validate file type
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "Only PDF documents and image files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    const maxBytes = isPdf ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      const maxMb = isPdf ? 25 : 5;
      return NextResponse.json(
        { error: `File too large. Maximum ${maxMb}MB for ${isPdf ? "PDF" : "image"} files.` },
        { status: 400 }
      );
    }

    // Generate a unique folder path
    // For PDFs: org-{orgId}/documents/{uuid}/
    // For logos: org-{orgId}/logos/{uuid}/
    const crypto = await import("crypto");
    const uuid = crypto.randomUUID();
    const subfolder = isPdf ? "documents" : "logos";
    const folder = `org-${targetOrgId}/${subfolder}/${uuid}`;

    // Preserve original extension
    const ext = file.name.split(".").pop() || (isPdf ? "pdf" : "png");
    const safeName = `upload-${Date.now()}.${ext.toLowerCase()}`;

    const uploadResult = await uploadDocument(
      file,
      folder,
      safeName,
      file.type || (isPdf ? "application/pdf" : "image/png")
    );

    return NextResponse.json({
      document_url: uploadResult.url,
      source_type: isPdf ? "pdf" : "image",
      is_local_storage: uploadResult.isLocalStorage,
    });
  } catch (error: any) {
    console.error("[VAULTSIGN UPLOAD] Error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
