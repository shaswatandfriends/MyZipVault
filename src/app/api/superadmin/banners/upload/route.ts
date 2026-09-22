import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

/**
 * POST /api/superadmin/banners/upload
 *
 * Upload a banner image to Supabase storage.
 * Returns the public URL of the uploaded image.
 *
 * Body (multipart/form-data):
 *   - file: File (required) — the banner image (PNG, JPG, WebP)
 *
 * Response:
 *   { success: true, url: "https://..." }
 *
 * Auth: super_admin only.
 * File size limit: 5MB.
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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 5MB." },
        { status: 400 },
      );
    }

    // Upload to Supabase storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const uploadResult = await uploadFile(buffer, fileName, file.type, "banners");

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload image" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
    });
  } catch (error: any) {
    console.error("[BANNERS_UPLOAD]", error);
    return NextResponse.json({ error: "Failed to upload banner" }, { status: 500 });
  }
}
