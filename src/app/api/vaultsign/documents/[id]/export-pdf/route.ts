import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tiptapToPdfmake, htmlToPdfmake } from "@/lib/vaultsign/tiptap-to-pdfmake";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import { generatePdfBuffer, HELVETICA_FONTS } from "@/lib/vaultsign/pdfmake-server";

// POST: Export PDF — for Word docs, convert content → pdfmake → PDF; for PDF docs, return signed URL
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

    // For PDF documents, just return the signed original file URL
    if (document.source_type === "pdf") {
      const fileUrl = document.original_file_url || document.edited_pdf_url;
      if (!fileUrl) {
        return NextResponse.json({ error: "No PDF file URL" }, { status: 404 });
      }

      // If it's already a data URL (base64), return as-is
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

    // For Word documents, convert content to PDF using pdfmake
    if (!document.tiptap_content) {
      return NextResponse.json({ error: "No content to export. Save the document first." }, { status: 400 });
    }

    const placeholderValues = JSON.parse(document.placeholder_values || "{}");
    const org = document.organization;

    // Build common options for PDF generation
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

    // Determine content format and generate pdfmake docDefinition
    let docDefinition;
    const rawContent = document.tiptap_content;

    try {
      // Try parsing as TipTap JSON first
      const parsed = JSON.parse(rawContent);
      if (parsed.type === "doc" && parsed.content) {
        // It's valid TipTap JSON
        docDefinition = tiptapToPdfmake(rawContent, pdfOptions);
      } else {
        // Valid JSON but not TipTap — treat as HTML
        docDefinition = htmlToPdfmake(rawContent, pdfOptions);
      }
    } catch {
      // Not valid JSON — it's HTML content from our docx-to-html converter
      docDefinition = htmlToPdfmake(rawContent, pdfOptions);
    }

    // Validate docDefinition has content
    if (!docDefinition || !docDefinition.content || docDefinition.content.length === 0) {
      return NextResponse.json({ error: "No printable content found in document" }, { status: 400 });
    }

    // Generate PDF buffer using shared utility (handles ESM/CJS interop + timeout)
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generatePdfBuffer(docDefinition, HELVETICA_FONTS, 30000);
    } catch (pdfErr: any) {
      console.error("[VAULTSIGN] PDF generation error:", pdfErr);
      return NextResponse.json({
        error: `PDF generation failed: ${pdfErr.message || "Unknown error"}`,
      }, { status: 500 });
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
      // If upload fails, convert PDF buffer to base64 data URL as fallback
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
      // Non-critical — the PDF was generated, just the DB update failed
    }

    // Generate signed URL for the uploaded file
    let pdfResponseUrl: string;
    if (uploadResult.url.startsWith("data:")) {
      // Base64 data URL — return as-is (can't sign it)
      pdfResponseUrl = uploadResult.url;
    } else {
      try {
        pdfResponseUrl = await getDocumentSignedUrl(uploadResult.url);
      } catch (signErr) {
        console.error("[VAULTSIGN] Signed URL generation failed:", signErr);
        pdfResponseUrl = uploadResult.url;
      }
    }

    return NextResponse.json({ pdf_url: pdfResponseUrl, source_type: "word" });
  } catch (error: any) {
    console.error("[VAULTSIGN] Export PDF error:", error);
    return NextResponse.json({
      error: `Export PDF failed: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}
