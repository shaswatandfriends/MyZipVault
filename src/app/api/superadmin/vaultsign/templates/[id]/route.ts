import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get a specific template
export async function GET(
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
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        vault_sign_documents: {
          select: { id: true, document_name: true, status: true },
          take: 10,
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...template,
      predefined_sign_fields: JSON.parse(template.predefined_sign_fields || "[]"),
      placeholder_variables: JSON.parse(template.placeholder_variables || "[]"),
      header_config: JSON.parse(template.header_config || "{}"),
      footer_config: JSON.parse(template.footer_config || "{}"),
      show_header_footer: template.show_header_footer !== false,
    });
  } catch (error) {
    console.error("[VAULTSIGN] Get template error:", error);
    return NextResponse.json({ error: "Failed to get template" }, { status: 500 });
  }
}

// PATCH: Update template
export async function PATCH(
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

    const body = await request.json();
    const allowedFields = [
      "name",
      "description",
      "document_type",
      "source_type",
      "original_file_url",
      "tiptap_content",
      "predefined_sign_fields",
      "placeholder_variables",
      "header_config",
      "footer_config",
      "show_header_footer",
      "is_active",
    ];

    const updateData: any = { updated_at: new Date() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (["predefined_sign_fields", "placeholder_variables", "header_config", "footer_config"].includes(field)) {
          updateData[field] = typeof body[field] === "string" ? body[field] : JSON.stringify(body[field]);
        } else if (field === "tiptap_content" && body[field] !== null) {
          updateData[field] = typeof body[field] === "string" ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updatedTemplate = await db.vaultSignTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      ...updatedTemplate,
      predefined_sign_fields: JSON.parse(updatedTemplate.predefined_sign_fields || "[]"),
      placeholder_variables: JSON.parse(updatedTemplate.placeholder_variables || "[]"),
      header_config: JSON.parse(updatedTemplate.header_config || "{}"),
      footer_config: JSON.parse(updatedTemplate.footer_config || "{}"),
    });
  } catch (error) {
    console.error("[VAULTSIGN] Update template error:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE: Soft delete (deactivate) template
export async function DELETE(
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

    // Soft delete by deactivating
    await db.vaultSignTemplate.update({
      where: { id: templateId },
      data: { is_active: false, updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VAULTSIGN] Delete template error:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
