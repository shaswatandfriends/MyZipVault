import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadDocument } from "@/lib/vaultsign/supabase-storage";

/**
 * POST /api/vaultsign/documents/upload
 *
 * Upload a PDF file to use as a VaultSign document source.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (role !== "client_recruiter" && role !== "client_admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file: any = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const fileName: string = file.name || "upload.pdf";
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const fileSize: number = file.size || 0;
    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
    }

    const userId = (session.user as any).id as string;
    const orgId = (session.user as any).organizationId as number | null;

    // Convert to Buffer for server-side compatibility
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const folder = `org-${orgId || "unknown"}/user-${userId}`;
    const uploadResult = await uploadDocument(
      fileBuffer,
      folder,
      fileName,
      "application/pdf"
    );

    return NextResponse.json({
      document_url: uploadResult.url,
      source_type: "pdf",
      is_local_storage: uploadResult.isLocalStorage,
      file_name: fileName,
      file_size: fileSize,
    });
  } catch (error: any) {
    console.error("[VAULTSIGN UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
