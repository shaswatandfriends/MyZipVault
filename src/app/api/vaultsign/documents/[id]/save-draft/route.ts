import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT: Auto-save tiptap_content + placeholder_values for a draft document
export async function PUT(
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

    // Only draft documents can be auto-saved
    if (document.status !== "draft") {
      return NextResponse.json({ error: "Only draft documents can be saved" }, { status: 400 });
    }

    // Check access
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = { updated_at: new Date() };

    if (body.tiptap_content !== undefined) {
      updateData.tiptap_content = typeof body.tiptap_content === "string"
        ? body.tiptap_content
        : JSON.stringify(body.tiptap_content);
    }

    if (body.placeholder_values !== undefined) {
      updateData.placeholder_values = typeof body.placeholder_values === "string"
        ? body.placeholder_values
        : JSON.stringify(body.placeholder_values);
    }

    if (body.sign_fields !== undefined) {
      updateData.sign_fields = typeof body.sign_fields === "string"
        ? body.sign_fields
        : JSON.stringify(body.sign_fields);
    }

    if (body.document_name !== undefined) {
      updateData.document_name = body.document_name;
    }

    if (body.header_config !== undefined) {
      updateData.header_config = typeof body.header_config === "string"
        ? body.header_config
        : JSON.stringify(body.header_config);
    }

    if (body.footer_config !== undefined) {
      updateData.footer_config = typeof body.footer_config === "string"
        ? body.footer_config
        : JSON.stringify(body.footer_config);
    }

    if (body.show_header_footer !== undefined) {
      updateData.show_header_footer = body.show_header_footer;
    }

    await db.vaultSignDocument.update({
      where: { id: docId },
      data: updateData,
    });

    return NextResponse.json({ success: true, saved_at: new Date().toISOString() });
  } catch (error) {
    console.error("[VAULTSIGN] Auto-save error:", error);
    return NextResponse.json({ error: "Auto-save failed" }, { status: 500 });
  }
}
