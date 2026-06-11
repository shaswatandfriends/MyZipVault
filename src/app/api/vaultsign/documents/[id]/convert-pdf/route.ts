import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import { convertDocxToPdf, isLibreOfficeAvailable } from "@/lib/vaultsign/libreoffice-convert";

/**
 * POST: Convert DOCX to PDF using LibreOffice headless for exact format fidelity.
 *
 * This endpoint is used by the editor to generate a PDF preview of the original
 * DOCX file, preserving all formatting (fonts, spacing, page breaks, tables, etc.)
 * that is lost in the DOCX→HTML→TipTap pipeline.
 *
 * The converted PDF is stored as `edited_pdf_url` and returned as a signed URL.
 */
export async function POST(
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

    // Only for Word documents
    if (document.source_type !== "word") {
      return NextResponse.json({ error: "Only Word documents can be converted" }, { status: 400 });
    }

    // Check LibreOffice availability
    const loAvailable = await isLibreOfficeAvailable();
    if (!loAvailable) {
      return NextResponse.json({ error: "LibreOffice is not available on this server" }, { status: 503 });
    }

    // Need the original DOCX file URL
    if (!document.original_file_url) {
      return NextResponse.json({ error: "No original DOCX file available for conversion" }, { status: 400 });
    }

    // Fetch the original DOCX file
    let docxBuffer: Buffer;
    try {
      const fileUrl = document.original_file_url;

      if (fileUrl.startsWith("data:")) {
        const base64 = fileUrl.split(",")[1];
        if (!base64) throw new Error("Invalid data URL");
        docxBuffer = Buffer.from(base64, "base64");
      } else {
        // Get signed URL for the file
        let urlToFetch = fileUrl;
        try {
          urlToFetch = await getDocumentSignedUrl(fileUrl, 5);
        } catch {
          // Use original URL
        }

        const response = await fetch(urlToFetch, {
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch DOCX: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        docxBuffer = Buffer.from(arrayBuffer);
      }
    } catch (fetchErr: any) {
      console.error("[VAULTSIGN] Failed to fetch DOCX for conversion:", fetchErr);
      return NextResponse.json({
        error: `Failed to fetch original DOCX file: ${fetchErr.message}`,
      }, { status: 500 });
    }

    // Convert using LibreOffice
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await convertDocxToPdf(docxBuffer, { timeoutMs: 30000 });
    } catch (convertErr: any) {
      console.error("[VAULTSIGN] LibreOffice conversion error:", convertErr);
      return NextResponse.json({
        error: `DOCX to PDF conversion failed: ${convertErr.message}`,
      }, { status: 500 });
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json({ error: "Conversion produced empty PDF" }, { status: 500 });
    }

    // Upload the converted PDF to storage
    let uploadResult;
    try {
      uploadResult = await uploadGeneratedPdf(
        pdfBuffer,
        `org-${document.organization_id}/doc-${document.id}`,
        `libreoffice-converted-${Date.now()}.pdf`
      );
    } catch (uploadErr: any) {
      console.error("[VAULTSIGN] PDF upload error:", uploadErr);
      const base64 = pdfBuffer.toString("base64");
      uploadResult = {
        url: `data:application/pdf;base64,${base64}`,
        isLocalStorage: true,
      };
    }

    // Update the document's edited_pdf_url with the LibreOffice-converted PDF
    try {
      await db.vaultSignDocument.update({
        where: { id: docId },
        data: {
          edited_pdf_url: uploadResult.url,
          updated_at: new Date(),
        },
      });
    } catch (dbErr) {
      console.error("[VAULTSIGN] Failed to update edited_pdf_url:", dbErr);
    }

    // Generate signed URL
    let pdfResponseUrl: string;
    if (uploadResult.url.startsWith("data:")) {
      pdfResponseUrl = uploadResult.url;
    } else {
      try {
        pdfResponseUrl = await getDocumentSignedUrl(uploadResult.url, 30);
      } catch (signErr) {
        console.error("[VAULTSIGN] Signed URL generation failed:", signErr);
        pdfResponseUrl = uploadResult.url;
      }
    }

    return NextResponse.json({
      pdf_url: pdfResponseUrl,
      source_type: "word",
      conversion_method: "libreoffice",
    });
  } catch (error: any) {
    console.error("[VAULTSIGN] Convert PDF error:", error);
    return NextResponse.json({
      error: `Convert PDF failed: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}
