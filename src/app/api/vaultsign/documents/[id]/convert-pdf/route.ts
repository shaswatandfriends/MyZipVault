import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import { convertDocxToPdf, isLibreOfficeAvailable } from "@/lib/vaultsign/libreoffice-convert";
import { tiptapToPdfmake, htmlToPdfmake } from "@/lib/vaultsign/tiptap-to-pdfmake";
import { generatePdfBuffer, HELVETICA_FONTS } from "@/lib/vaultsign/pdfmake-server";

/**
 * POST: Convert DOCX to PDF for preview.
 *
 * Strategy:
 * 1. If LibreOffice is available → use it for exact format fidelity (DOCX → PDF)
 * 2. If LibreOffice is NOT available (e.g., Vercel serverless) → fall back to pdfmake
 *    using the TipTap content to generate an approximate PDF preview
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

    // Only for Word documents
    if (document.source_type !== "word") {
      return NextResponse.json({ error: "Only Word documents can be converted" }, { status: 400 });
    }

    let pdfBuffer: Buffer;
    let conversionMethod = "pdfmake";

    // Strategy 1: Try LibreOffice for exact format fidelity
    const loAvailable = await isLibreOfficeAvailable();

    if (loAvailable && document.original_file_url) {
      try {
        console.log("[VAULTSIGN] Attempting LibreOffice DOCX→PDF conversion for preview");
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
      // LibreOffice not available or no original file — use pdfmake fallback
      console.log("[VAULTSIGN] LibreOffice not available, using pdfmake for preview");
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
        `${conversionMethod}-preview-${Date.now()}.pdf`
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
      conversion_method: conversionMethod,
    });
  } catch (error: any) {
    console.error("[VAULTSIGN] Convert PDF error:", error);
    return NextResponse.json({
      error: `Convert PDF failed: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}

// ─── Helper: Fetch DOCX buffer from URL ──────────────────────────────
async function fetchDocxBuffer(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith("data:")) {
    const base64 = fileUrl.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    return Buffer.from(base64, "base64");
  }

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
    throw new Error("No content to generate preview. Save the document first.");
  }

  const placeholderValues = JSON.parse(document.placeholder_values || "{}");
  const org = document.organization;

  const pdfOptions = {
    headerConfig: (() => { try { return JSON.parse((document as any).header_config || "{}"); } catch { return {}; } })(),
    footerConfig: (() => { try { return JSON.parse((document as any).footer_config || "{}"); } catch { return {}; } })(),
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
