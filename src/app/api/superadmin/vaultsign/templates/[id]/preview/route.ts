import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tiptapToPdfmake } from "@/lib/vaultsign/tiptap-to-pdfmake";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import PdfPrinter from "pdfmake";

// POST: Generate a preview PDF for a template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const templateId = parseInt(id);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await db.vaultSignTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (!template.tiptap_content) {
      return NextResponse.json({ error: "No content to preview" }, { status: 400 });
    }

    // Generate preview with sample placeholder values
    const placeholderVars = JSON.parse(template.placeholder_variables || "[]");
    const sampleValues: Record<string, string> = {};
    for (const v of placeholderVars) {
      sampleValues[v.key] = `{{${v.label}}}`;
    }

    const docDefinition = tiptapToPdfmake(template.tiptap_content, {
      headerConfig: JSON.parse(template.header_config || "{}"),
      footerConfig: JSON.parse(template.footer_config || "{}"),
      documentTitle: template.name,
      placeholderValues: sampleValues,
    });

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

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", resolve);
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    const uploadResult = await uploadGeneratedPdf(
      pdfBuffer,
      "templates/preview",
      `template-${templateId}-preview-${Date.now()}.pdf`
    );

    const signedUrl = await getDocumentSignedUrl(uploadResult.url);

    return NextResponse.json({ pdf_url: signedUrl });
  } catch (error) {
    console.error("[VAULTSIGN] Template preview error:", error);
    return NextResponse.json({ error: "Preview generation failed" }, { status: 500 });
  }
}
