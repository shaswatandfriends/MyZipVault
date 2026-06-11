import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tiptapToPdfmake } from "@/lib/vaultsign/tiptap-to-pdfmake";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import { generatePdfBuffer, HELVETICA_FONTS } from "@/lib/vaultsign/pdfmake-server";

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

    // Generate PDF using shared utility with ESM/CJS interop handling
    const pdfBuffer = await generatePdfBuffer(docDefinition, HELVETICA_FONTS, 30000);

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
