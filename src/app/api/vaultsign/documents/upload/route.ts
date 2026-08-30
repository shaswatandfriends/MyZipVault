import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/vaultsign/documents/upload
 *
 * Upload a PDF file to use as a VaultSign document source.
 * Returns the document URL as a base64 data URL (works without Supabase Storage).
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

    // Validate file size (max 5MB for base64 — avoids Vercel function limits)
    const fileSize: number = file.size || 0;
    if (fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    // Convert to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return NextResponse.json({
      document_url: dataUrl,
      source_type: "pdf",
      is_local_storage: true,
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
