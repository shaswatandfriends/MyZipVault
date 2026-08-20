import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH: Update a resume version (rename, set active, update data)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const { id } = await params;
    const resumeId = parseInt(id);
    if (isNaN(resumeId)) {
      return NextResponse.json({ error: "Invalid resume ID" }, { status: 400 });
    }

    // Verify ownership
    const resume = await db.resume.findUnique({ where: { id: resumeId } });
    if (!resume || resume.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { version_name, is_active, parsed_data, ats_score, template_id } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (version_name !== undefined) updateData.version_name = version_name;
    if (parsed_data !== undefined) updateData.parsed_data = parsed_data;
    if (ats_score !== undefined) updateData.ats_score = ats_score;
    if (template_id !== undefined) updateData.template_id = template_id;

    // If setting as active, deactivate all others
    if (is_active === true) {
      await db.resume.updateMany({
        where: { candidate_user_id: userId, id: { not: resumeId } },
        data: { is_active: false },
      });
      updateData.is_active = true;
    }

    const updated = await db.resume.update({
      where: { id: resumeId },
      data: updateData,
    });

    return NextResponse.json({ resume: updated });
  } catch (error) {
    console.error("[RESUME_VERSION_PATCH]", error);
    return NextResponse.json({ error: "Failed to update resume version" }, { status: 500 });
  }
}

// DELETE: Delete a resume version
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const { id } = await params;
    const resumeId = parseInt(id);
    if (isNaN(resumeId)) {
      return NextResponse.json({ error: "Invalid resume ID" }, { status: 400 });
    }

    // Verify ownership
    const resume = await db.resume.findUnique({ where: { id: resumeId } });
    if (!resume || resume.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Don't allow deleting if it's the only resume
    const count = await db.resume.count({ where: { candidate_user_id: userId } });
    if (count <= 1) {
      return NextResponse.json(
        { error: "Cannot delete your only resume version. Create another version first." },
        { status: 400 }
      );
    }

    await db.resume.delete({ where: { id: resumeId } });

    // If deleted resume was active, activate the most recent remaining one
    if (resume.is_active) {
      const latest = await db.resume.findFirst({
        where: { candidate_user_id: userId },
        orderBy: { created_at: "desc" },
      });
      if (latest) {
        await db.resume.update({
          where: { id: latest.id },
          data: { is_active: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESUME_VERSION_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete resume version" }, { status: 500 });
  }
}
