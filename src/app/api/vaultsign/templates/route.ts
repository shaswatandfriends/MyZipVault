import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: List templates (for recruiter org + global templates created by super_admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "client_recruiter" && role !== "client_admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const document_type = searchParams.get("document_type");
    const source_type = searchParams.get("source_type");

    const where: any = { is_active: true };

    if (document_type) {
      where.document_type = document_type;
    }
    if (source_type) {
      where.source_type = source_type;
    }

    // Recruiters can see templates created by super_admin or their org's templates
    if (role !== "super_admin") {
      const orgId = (session.user as Record<string, unknown>).organizationId as number;
      // Get super_admin user IDs
      const superAdmins = await db.user.findMany({
        where: { role: "super_admin" },
        select: { id: true },
      });
      const superAdminIds = superAdmins.map((u) => u.id);

      where.OR = [
        { created_by: { in: superAdminIds } }, // Global templates
        { creator: { organization_id: orgId } }, // Org-specific templates
      ];
    }

    const templates = await db.vaultSignTemplate.findMany({
      where,
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
      },
      orderBy: { updated_at: "desc" },
    });

    // Get super_admin user IDs for source classification
    const superAdmins = await db.user.findMany({
      where: { role: "super_admin" },
      select: { id: true },
    });
    const superAdminIds = superAdmins.map((u) => u.id);

    // Parse JSON fields and add source info
    const parsedTemplates = templates.map((t: any) => ({
      ...t,
      predefined_sign_fields: JSON.parse(t.predefined_sign_fields || "[]"),
      placeholder_variables: JSON.parse(t.placeholder_variables || "[]"),
      header_config: JSON.parse(t.header_config || "{}"),
      footer_config: JSON.parse(t.footer_config || "{}"),
      show_header_footer: t.show_header_footer !== false,
      tiptap_content: t.tiptap_content ? (typeof t.tiptap_content === "string" ? t.tiptap_content : JSON.stringify(t.tiptap_content)) : null,
      source: superAdminIds.includes(t.created_by) ? "platform" : "shared",
    }));

    return NextResponse.json({ templates: parsedTemplates });
  } catch (error) {
    console.error("[VAULTSIGN] List templates error:", error);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}

// POST: Create template from existing document
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

    const userId = (session.user as Record<string, unknown>).id as number;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;

    const body = await request.json();
    const { document_id, template_name } = body;

    if (!document_id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    // Fetch the source document
    const document = await db.vaultSignDocument.findUnique({
      where: { id: parseInt(document_id.toString()) },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify access
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create template from document
    const template = await db.vaultSignTemplate.create({
      data: {
        name: template_name || document.document_name,
        description: `Template saved from: ${document.document_name}`,
        document_type: document.document_type,
        source_type: document.source_type,
        original_file_url: document.original_file_url || "",
        tiptap_content: document.tiptap_content,
        predefined_sign_fields: document.sign_fields || "[]",
        placeholder_variables: document.placeholder_values
          ? (() => {
              try {
                const values = JSON.parse(document.placeholder_values);
                return JSON.stringify(Object.keys(values).map(k => ({ key: k, label: k, description: k, category: "custom" })));
              } catch { return "[]"; }
            })()
          : "[]",
        show_header_footer: (document as any).show_header_footer !== false,
        created_by: userId,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("[VAULTSIGN] Create template error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
