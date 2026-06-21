import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * PUT /api/recruiter/bundles/[id]
 *   Updates a compliance bundle (client_admin only).
 *   Must belong to the admin's organization.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json(
        { error: "Only agency admins and recruiters can edit bundles" },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const bundleId = parseInt(id);
    if (isNaN(bundleId)) {
      return NextResponse.json({ error: "Invalid bundle ID" }, { status: 400 });
    }

    // Verify bundle belongs to this org
    const existing = await db.complianceBundle.findFirst({
      where: { id: bundleId, organization_id: organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, profession, specialty, checklistTemplateId, documents } = body;

    // Build update data (only update provided fields)
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Bundle name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (profession !== undefined) {
      updateData.profession = profession?.trim() || null;
    }
    if (specialty !== undefined) {
      updateData.specialty = specialty?.trim() || null;
    }

    // If checklist template is being changed, validate it
    if (checklistTemplateId !== undefined) {
      const template = await db.checklistTemplate.findFirst({
        where: { id: Number(checklistTemplateId), is_active: true },
      });
      if (!template) {
        return NextResponse.json({ error: "Invalid checklist template" }, { status: 400 });
      }
      updateData.checklist_template_id = Number(checklistTemplateId);
    }

    // If documents are being changed, validate and recalculate credit cost
    if (documents !== undefined) {
      const validDocTypes = ["checklist", "credential", "resume", "reference"];
      const safeDocuments = Array.isArray(documents)
        ? documents.filter((d: string) => validDocTypes.includes(d))
        : [];
      updateData.documents = JSON.stringify(safeDocuments);
      updateData.credit_cost = 1 + safeDocuments.length;
    }

    const updated = await db.complianceBundle.update({
      where: { id: bundleId },
      data: updateData,
      include: {
        checklist_template: {
          select: { id: true, name: true, profession: true, specialty: true },
        },
      },
    });

    return NextResponse.json({ bundle: updated });
  } catch (error) {
    console.error("[BUNDLES_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update bundle" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recruiter/bundles/[id]
 *   Soft-deletes a compliance bundle (sets is_active = false).
 *   client_admin only. Must belong to the admin's organization.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json(
        { error: "Only agency admins and recruiters can delete bundles" },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const bundleId = parseInt(id);
    if (isNaN(bundleId)) {
      return NextResponse.json({ error: "Invalid bundle ID" }, { status: 400 });
    }

    // Verify bundle belongs to this org
    const existing = await db.complianceBundle.findFirst({
      where: { id: bundleId, organization_id: organizationId, is_active: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    // Soft delete (set is_active = false) — preserves audit trail
    await db.complianceBundle.update({
      where: { id: bundleId },
      data: { is_active: false, updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BUNDLES_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete bundle" },
      { status: 500 }
    );
  }
}
