import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tiptapToPdfmake, htmlToPdfmake } from "@/lib/vaultsign/tiptap-to-pdfmake";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import { generatePdfBuffer, HELVETICA_FONTS } from "@/lib/vaultsign/pdfmake-server";
import { convertDocxToPdf, isLibreOfficeAvailable } from "@/lib/vaultsign/libreoffice-convert";

// POST: Export PDF — for Word docs, convert using LibreOffice (exact format) or pdfmake (fallback); for PDF docs, return signed URL
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
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            company_logo_url: true,
            company_address: true,
            company_phone: true,
            company_email: true,
            company_website: true,
          },
        },
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

    // ─── For completed documents with final_document_url ─────────────────────
    if (document.status === "completed" && document.final_document_url) {
      if (document.final_document_url.startsWith("data:")) {
        return NextResponse.json({ pdf_url: document.final_document_url, source_type: document.source_type });
      }
      try {
        const signedUrl = await getDocumentSignedUrl(document.final_document_url, 30);
        return NextResponse.json({ pdf_url: signedUrl, source_type: document.source_type });
      } catch (signErr) {
        console.error("[VAULTSIGN] Final PDF signed URL error:", signErr);
        return NextResponse.json({ pdf_url: document.final_document_url, source_type: document.source_type });
      }
    }

    // ─── For PDF source documents ─────────────────────────────────────────
    if (document.source_type === "pdf") {
      const fileUrl = document.original_file_url || document.edited_pdf_url;
      if (!fileUrl) {
        return NextResponse.json({ error: "No PDF file URL" }, { status: 404 });
      }

      if (fileUrl.startsWith("data:")) {
        return NextResponse.json({ pdf_url: fileUrl, source_type: "pdf" });
      }

      try {
        const signedUrl = await getDocumentSignedUrl(fileUrl, 30);
        return NextResponse.json({ pdf_url: signedUrl, source_type: "pdf" });
      } catch (signErr) {
        console.error("[VAULTSIGN] PDF signed URL error:", signErr);
        return NextResponse.json({ pdf_url: fileUrl, source_type: "pdf" });
      }
    }

    // ─── For Word source documents ────────────────────────────────────────
    // Strategy 1: Use LibreOffice headless for exact format fidelity (DOCX → PDF)
    // Strategy 2: Fallback to pdfmake if LibreOffice is unavailable or fails
    let pdfBuffer: Buffer;
    let conversionMethod = "pdfmake";

    const loAvailable = await isLibreOfficeAvailable();

    if (loAvailable && document.original_file_url) {
      try {
        console.log("[VAULTSIGN] Attempting LibreOffice DOCX→PDF conversion for exact format fidelity");
        const docxBuffer = await fetchDocxBuffer(document.original_file_url);
        pdfBuffer = await convertDocxToPdf(docxBuffer, { timeoutMs: 30000 });
        conversionMethod = "libreoffice";
        console.log("[VAULTSIGN] LibreOffice conversion successful, PDF size:", pdfBuffer.length);
      } catch (loErr: any) {
        console.warn("[VAULTSIGN] LibreOffice conversion failed, falling back to pdfmake:", loErr.message);
        pdfBuffer = await generatePdfViaPdfmake(document);
        conversionMethod = "pdfmake-fallback";
      }
    } else {
      // No original file URL or LibreOffice unavailable — use pdfmake
      pdfBuffer = await generatePdfViaPdfmake(document);
      conversionMethod = loAvailable ? "pdfmake-no-original" : "pdfmake-no-libreoffice";
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json({ error: "Generated PDF is empty" }, { status: 500 });
    }

    // Upload the generated PDF to storage
    let uploadResult;
    try {
      uploadResult = await uploadGeneratedPdf(
        pdfBuffer,
        `org-${document.organization_id}/doc-${document.id}`,
        `edited-${Date.now()}.pdf`
      );
    } catch (uploadErr: any) {
      console.error("[VAULTSIGN] PDF upload error:", uploadErr);
      const base64 = pdfBuffer.toString("base64");
      uploadResult = {
        url: `data:application/pdf;base64,${base64}`,
        isLocalStorage: true,
      };
    }

    // Update the document's edited_pdf_url
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

    // Generate signed URL for the uploaded file
    let pdfResponseUrl: string;
    if (uploadResult.url.startsWith("data:")) {
      pdfResponseUrl = uploadResult.url;
    } else {
      try {
        pdfResponseUrl = await getDocumentSignedUrl(uploadResult.url);
      } catch (signErr) {
        console.error("[VAULTSIGN] Signed URL generation failed:", signErr);
        pdfResponseUrl = uploadResult.url;
      }
    }

    return NextResponse.json({
      pdf_url: pdfResponseUrl,
      source_type: "word",
      conversion_method: conversionMethod,
    });
  } catch (error: any) {
    console.error("[VAULTSIGN] Export PDF error:", error);
    return NextResponse.json({
      error: `Export PDF failed: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}

// ─── Helper: Fetch DOCX buffer from URL ──────────────────────────────
async function fetchDocxBuffer(fileUrl: string): Promise<Buffer> {
  // If it's a data URL (base64), decode directly
  if (fileUrl.startsWith("data:")) {
    const base64 = fileUrl.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    return Buffer.from(base64, "base64");
  }

  // Try to get a signed URL first
  let urlToFetch = fileUrl;
  try {
    urlToFetch = await getDocumentSignedUrl(fileUrl, 5);
  } catch {
    // Use original URL as-is
  }

  const response = await fetch(urlToFetch, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch DOCX file: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Helper: Generate PDF via pdfmake (fallback) ─────────────────────
async function generatePdfViaPdfmake(document: any): Promise<Buffer> {
  if (!document.tiptap_content) {
    throw new Error("No content to export. Save the document first.");
  }

  const placeholderValues = JSON.parse(document.placeholder_values || "{}");
  const org = document.organization;

  const pdfOptions = {
    showHeaderFooter: (document as any).show_header_footer !== false,
    organization: {
      name: org?.name || undefined,
      logo_url: org?.company_logo_url || undefined,
      address: org?.company_address || undefined,
      phone: org?.company_phone || undefined,
      email: org?.company_email || undefined,
      website: org?.company_website || undefined,
    },
    documentTitle: document.document_name,
    placeholderValues,
  };

  // Determine content format and generate pdfmake docDefinition
  let docDefinition;
  const rawContent = document.tiptap_content;

  try {
    const parsed = JSON.parse(rawContent);
    if (parsed.type === "doc" && parsed.content) {
      docDefinition = tiptapToPdfmake(rawContent, pdfOptions);
    } else {
      docDefinition = htmlToPdfmake(rawContent, pdfOptions);
    }
  } catch {
    docDefinition = htmlToPdfmake(rawContent, pdfOptions);
  }

  if (!docDefinition || !docDefinition.content || docDefinition.content.length === 0) {
    throw new Error("No printable content found in document");
  }

  return generatePdfBuffer(docDefinition, HELVETICA_FONTS, 30000);
}
