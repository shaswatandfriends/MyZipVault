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

    // Parse JSON fields
    const parsedTemplates = templates.map((t: any) => ({
      ...t,
      predefined_sign_fields: JSON.parse(t.predefined_sign_fields || "[]"),
      placeholder_variables: JSON.parse(t.placeholder_variables || "[]"),
      header_config: JSON.parse(t.header_config || "{}"),
      footer_config: JSON.parse(t.footer_config || "{}"),
      tiptap_content: t.tiptap_content ? (typeof t.tiptap_content === "string" ? t.tiptap_content : JSON.stringify(t.tiptap_content)) : null,
    }));

    return NextResponse.json({ templates: parsedTemplates });
  } catch (error) {
    console.error("[VAULTSIGN] List templates error:", error);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}
