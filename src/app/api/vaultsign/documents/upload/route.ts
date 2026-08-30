import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadDocument } from "@/lib/vaultsign/supabase-storage";

/**
 * POST /api/vaultsign/documents/upload
 *
 * Upload a PDF file to use as a VaultSign document source.
 * Returns the document URL and source type.
 *
 * Body: FormData with:
 *   - file: File (PDF, max 10MB)
 *   - organizationId: string (optional, for folder path)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "client_recruiter" && role !== "client_admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number | null;

    // Upload to storage
    const folder = `org-${orgId || "unknown"}/user-${userId}`;
    const uploadResult = await uploadDocument(
      file,
      folder,
      file.name,
      "application/pdf"
    );

    return NextResponse.json({
      document_url: uploadResult.url,
      source_type: "pdf",
      is_local_storage: uploadResult.isLocalStorage,
      file_name: file.name,
      file_size: file.size,
    });
  } catch (error) {
    console.error("[VAULTSIGN UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
