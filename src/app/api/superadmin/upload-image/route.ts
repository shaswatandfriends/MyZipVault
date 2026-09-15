import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, STORAGE_BUCKETS } from "@/lib/storage";

/**
 * POST /api/superadmin/upload-image
 *
 * Upload a branding image (logo, favicon, or OG image) to Supabase storage.
 * Returns the public URL of the uploaded image.
 *
 * Body (multipart/form-data):
 *   - file: File (required) — the image file (PNG, JPG, ICO, SVG, WebP)
 *   - type: string (required) — "logo" | "favicon" | "ogImage"
 *
 * Response:
 *   { success: true, url: "https://...", type: "logo" }
 *
 * Auth: super_admin only.
 * File size limit: 2MB (logos/favicons should be small).
 * Allowed types: image/png, image/jpeg, image/svg+xml, image/x-icon, image/webp, image/vnd.microsoft.icon
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!type || !["logo", "favicon", "ogImage"].includes(type)) {
      return NextResponse.json(
        { error: "type must be one of: logo, favicon, ogImage" },
        { status: 400 }
      );
    }

    // Validate file size (2MB max)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: 2MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: PNG, JPG, SVG, ICO, WebP` },
        { status: 400 }
      );
    }

    // Upload to Supabase storage (branding bucket, folder = type)
    const uploadResult = await uploadFile(
      STORAGE_BUCKETS.BRANDING,
      type, // folder: "logo" | "favicon" | "ogImage"
      file,
      file.name,
      file.type
    );

    console.log(`[UPLOAD_IMAGE] superadmin uploaded ${type}: ${uploadResult.url} (local: ${uploadResult.isLocalStorage})`);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      type,
      isLocalStorage: uploadResult.isLocalStorage,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error("[UPLOAD_IMAGE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
