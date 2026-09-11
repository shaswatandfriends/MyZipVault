import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/resume-templates/[id]
 * Fetch a single template by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as Record<string, unknown>).role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const template = await db.resumeTemplate.findUnique({ where: { id: templateId } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("[RESUME_TEMPLATE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

/**
 * PUT /api/superadmin/resume-templates/[id]
 * Update template fields. Body: { name?, description?, layout_config?, is_active? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as Record<string, unknown>).role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);

    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { name, description, layout_config, is_active } = body;

    const existing = await db.resumeTemplate.findUnique({ where: { id: templateId } });
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const updated = await db.resumeTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(layout_config !== undefined ? {
          layout_config: typeof layout_config === "string" ? JSON.parse(layout_config) : layout_config,
        } : {}),
        ...(is_active !== undefined ? { is_active: !!is_active } : {}),
        updated_by: userId,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ template: updated });
  } catch (error: any) {
    console.error("[RESUME_TEMPLATE_PUT]", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

/**
 * DELETE /api/superadmin/resume-templates/[id]
 * Soft-delete by setting is_active=false (preserves history for existing resumes).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as Record<string, unknown>).role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const existing = await db.resumeTemplate.findUnique({ where: { id: templateId } });
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // Soft-delete — set is_active=false
    await db.resumeTemplate.update({
      where: { id: templateId },
      data: { is_active: false },
    });

    return NextResponse.json({ success: true, soft_deleted: true });
  } catch (error: any) {
    console.error("[RESUME_TEMPLATE_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
