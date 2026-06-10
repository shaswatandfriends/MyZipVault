import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await db.vaultSignTemplate.findMany({
      where: { is_active: true },
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[VAULTSIGN_TEMPLATES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || null;
    const documentType = (formData.get("document_type") as string) || "custom";
    const placeholderFieldsStr = (formData.get("placeholder_fields") as string) || "[]";
    const predefinedSignFieldsStr = (formData.get("predefined_sign_fields") as string) || "[]";
    const file = formData.get("file") as File | null;

    if (!name) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    // Validate JSON strings
    let placeholderFields = "[]";
    let predefinedSignFields = "[]";
    try {
      JSON.parse(placeholderFieldsStr);
      placeholderFields = placeholderFieldsStr;
    } catch {
      return NextResponse.json(
        { error: "Invalid placeholder_fields JSON" },
        { status: 400 }
      );
    }
    try {
      JSON.parse(predefinedSignFieldsStr);
      predefinedSignFields = predefinedSignFieldsStr;
    } catch {
      return NextResponse.json(
        { error: "Invalid predefined_sign_fields JSON" },
        { status: 400 }
      );
    }

    // Create template record first to get the ID
    const template = await db.vaultSignTemplate.create({
      data: {
        name,
        description,
        document_url: "", // placeholder, will update after upload
        document_type: documentType,
        placeholder_fields: placeholderFields,
        predefined_sign_fields: predefinedSignFields,
        created_by: userId,
      },
    });

    // Upload PDF to Supabase Storage
    const { url } = await uploadFile(
      "vaultsign-templates",
      `${template.id}`,
      file,
      file.name,
      "application/pdf"
    );

    // Update template with document URL
    await db.vaultSignTemplate.update({
      where: { id: template.id },
      data: { document_url: url },
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: "super_admin",
        action: "create_vaultsign_template",
        entity_type: "vaultsign_template",
        entity_id: template.id,
      },
    });

    return NextResponse.json(
      { template: { ...template, document_url: url } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[VAULTSIGN_TEMPLATES_POST]", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
