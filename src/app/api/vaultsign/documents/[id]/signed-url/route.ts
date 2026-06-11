import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";

/**
 * GET: Get a signed URL for the document's PDF file.
 * This is a lightweight alternative to export-pdf that just signs the existing URL
 * without regenerating the PDF.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: docId },
      select: {
        id: true,
        organization_id: true,
        source_type: true,
        original_file_url: true,
        edited_pdf_url: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check access
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Determine which URL to sign
    let fileUrl = "";

    if (document.source_type === "pdf" && document.original_file_url) {
      fileUrl = document.original_file_url;
    } else if (document.edited_pdf_url) {
      fileUrl = document.edited_pdf_url;
    } else if (document.original_file_url) {
      fileUrl = document.original_file_url;
    }

    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL available" }, { status: 404 });
    }

    // If it's already a data URL (base64), return as-is
    if (fileUrl.startsWith("data:")) {
      return NextResponse.json({ signed_url: fileUrl, source_type: document.source_type });
    }

    // Generate a signed URL for the file
    try {
      const signedUrl = await getDocumentSignedUrl(fileUrl, 30); // 30 minute expiry
      return NextResponse.json({ signed_url: signedUrl, source_type: document.source_type });
    } catch (signErr) {
      console.error("[VAULTSIGN] Signed URL generation failed:", signErr);
      // Fall back to returning the URL as-is (might work if bucket is public)
      return NextResponse.json({ signed_url: fileUrl, source_type: document.source_type });
    }
  } catch (error) {
    console.error("[VAULTSIGN] Signed URL error:", error);
    return NextResponse.json({ error: "Failed to get signed URL" }, { status: 500 });
  }
}
