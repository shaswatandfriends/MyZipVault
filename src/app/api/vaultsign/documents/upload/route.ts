import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadDocument } from "@/lib/vaultsign/supabase-storage";
import { docxToFormattedHtml } from "@/lib/vaultsign/docx-to-html";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "client_recruiter" && role !== "client_admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isDocx = fileName.endsWith(".docx") || fileName.endsWith(".doc");
    const isPdf = fileName.endsWith(".pdf");

    if (!isDocx && !isPdf) {
      return NextResponse.json({ error: "Only .docx and .pdf files are supported" }, { status: 400 });
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const orgId = (session.user as Record<string, unknown>).organizationId as number || 0;
    const folder = `org-${orgId}/uploads`;
    const uploadResult = await uploadDocument(buffer, folder, file.name, file.type);

    if (isDocx) {
      // Convert .docx to HTML preserving formatting (colors, fonts, sizes, spacing)
      let htmlContent = "";
      try {
        htmlContent = await docxToFormattedHtml(buffer);
      } catch (err) {
        console.error("[VAULTSIGN] docx-to-html conversion error:", err);
        htmlContent = "<p>Document content could not be converted. Please edit manually.</p>";
      }

      return NextResponse.json({
        document_url: uploadResult.url,
        html_content: htmlContent,
        source_type: "word",
      });
    } else {
      // PDF — just return the URL
      return NextResponse.json({
        document_url: uploadResult.url,
        source_type: "pdf",
      });
    }
  } catch (error) {
    console.error("[VAULTSIGN] Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
