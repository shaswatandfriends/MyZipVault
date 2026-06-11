import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tiptapToPdfmake } from "@/lib/vaultsign/tiptap-to-pdfmake";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import PdfPrinter from "pdfmake";

// POST: Export PDF — for Word docs, convert TipTap → pdfmake → PDF; for PDF docs, return original URL
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

    // For PDF documents, just return the original file URL
    if (document.source_type === "pdf") {
      const signedUrl = await getDocumentSignedUrl(document.original_file_url || "");
      return NextResponse.json({ pdf_url: signedUrl, source_type: "pdf" });
    }

    // For Word documents, convert TipTap content to PDF using pdfmake
    if (!document.tiptap_content) {
      return NextResponse.json({ error: "No content to export" }, { status: 400 });
    }

    const placeholderValues = JSON.parse(document.placeholder_values || "{}");
    const org = document.organization;

    // Generate pdfmake docDefinition
    const docDefinition = tiptapToPdfmake(document.tiptap_content, {
      headerConfig: JSON.parse(document.header_config || "{}"),
      footerConfig: JSON.parse(document.footer_config || "{}"),
      organization: {
        name: org?.name,
        logo_url: org?.company_logo_url,
        address: org?.company_address,
        phone: org?.company_phone,
        email: org?.company_email,
        website: org?.company_website,
      },
      documentTitle: document.document_name,
      placeholderValues,
    });

    // Generate PDF using pdfmake
    const fonts = {
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Collect PDF into buffer
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", resolve);
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Upload the generated PDF to storage
    const uploadResult = await uploadGeneratedPdf(
      pdfBuffer,
      `org-${document.organization_id}/doc-${document.id}`,
      `edited-${Date.now()}.pdf`
    );

    // Update the document's edited_pdf_url
    await db.vaultSignDocument.update({
      where: { id: docId },
      data: {
        edited_pdf_url: uploadResult.url,
        updated_at: new Date(),
      },
    });

    const signedUrl = await getDocumentSignedUrl(uploadResult.url);

    return NextResponse.json({ pdf_url: signedUrl, source_type: "word" });
  } catch (error) {
    console.error("[VAULTSIGN] Export PDF error:", error);
    return NextResponse.json({ error: "Export PDF failed" }, { status: 500 });
  }
}
