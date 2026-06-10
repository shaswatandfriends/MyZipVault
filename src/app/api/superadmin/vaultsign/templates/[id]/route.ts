import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await db.vaultSignTemplate.findUnique({
      where: { id: templateId },
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("[VAULTSIGN_TEMPLATE_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await db.vaultSignTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check if request is multipart/form-data (has file) or JSON
    const contentType = request.headers.get("content-type") || "";

    let updateData: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const name = formData.get("name") as string | null;
      const description = formData.get("description") as string | null;
      const documentType = formData.get("document_type") as string | null;
      const placeholderFieldsStr = formData.get("placeholder_fields") as string | null;
      const predefinedSignFieldsStr = formData.get("predefined_sign_fields") as string | null;
      const file = formData.get("file") as File | null;

      if (name) updateData.name = name;
      if (description !== null) updateData.description = description;
      if (documentType) updateData.document_type = documentType;
      if (placeholderFieldsStr) {
        try {
          JSON.parse(placeholderFieldsStr);
          updateData.placeholder_fields = placeholderFieldsStr;
        } catch {
          return NextResponse.json(
            { error: "Invalid placeholder_fields JSON" },
            { status: 400 }
          );
        }
      }
      if (predefinedSignFieldsStr) {
        try {
          JSON.parse(predefinedSignFieldsStr);
          updateData.predefined_sign_fields = predefinedSignFieldsStr;
        } catch {
          return NextResponse.json(
            { error: "Invalid predefined_sign_fields JSON" },
            { status: 400 }
          );
        }
      }

      if (file) {
        const { url } = await uploadFile(
          "vaultsign-templates",
          `${templateId}`,
          file,
          file.name,
          "application/pdf"
        );
        updateData.document_url = url;
      }
    } else {
      const body = await request.json();
      const { name, description, document_type, placeholder_fields, predefined_sign_fields } = body;

      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (document_type) updateData.document_type = document_type;
      if (placeholder_fields) {
        try {
          JSON.parse(typeof placeholder_fields === "string" ? placeholder_fields : JSON.stringify(placeholder_fields));
          updateData.placeholder_fields = typeof placeholder_fields === "string" ? placeholder_fields : JSON.stringify(placeholder_fields);
        } catch {
          return NextResponse.json(
            { error: "Invalid placeholder_fields JSON" },
            { status: 400 }
          );
        }
      }
      if (predefined_sign_fields) {
        try {
          JSON.parse(typeof predefined_sign_fields === "string" ? predefined_sign_fields : JSON.stringify(predefined_sign_fields));
          updateData.predefined_sign_fields = typeof predefined_sign_fields === "string" ? predefined_sign_fields : JSON.stringify(predefined_sign_fields);
        } catch {
          return NextResponse.json(
            { error: "Invalid predefined_sign_fields JSON" },
            { status: 400 }
          );
        }
      }
    }

    updateData.updated_at = new Date();

    const updated = await db.vaultSignTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: "super_admin",
        action: "update_vaultsign_template",
        entity_type: "vaultsign_template",
        entity_id: templateId,
      },
    });

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error("[VAULTSIGN_TEMPLATE_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await db.vaultSignTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Soft delete
    await db.vaultSignTemplate.update({
      where: { id: templateId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: "super_admin",
        action: "delete_vaultsign_template",
        entity_type: "vaultsign_template",
        entity_id: templateId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VAULTSIGN_TEMPLATE_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
