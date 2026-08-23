import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_RESUMES = 3;

/**
 * GET /api/candidate/resume/versions
 *
 * Lists all of the candidate's resumes (uploaded + AI-built).
 * Returns count + max so the UI can enforce the 3-version limit.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const resumes = await db.resume.findMany({
      where: { candidate_user_id: userId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        file_url: true,
        is_builder_resume: true,
        parsed_data: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      resumes: resumes.map((r) => ({
        id: r.id,
        fileUrl: r.file_url,
        isBuilderResume: r.is_builder_resume,
        hasParsedData: !!r.parsed_data,
        parsedData: r.parsed_data ? JSON.parse(r.parsed_data) : null,
        createdAt: r.created_at,
      })),
      count: resumes.length,
      max: MAX_RESUMES,
    });
  } catch (error) {
    console.error("[RESUME_VERSIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch resume versions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/candidate/resume/versions?id=123
 *
 * Deletes a specific resume version.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Resume ID is required" }, { status: 400 });
    }

    const resumeId = parseInt(id, 10);

    // Verify ownership before deleting
    const resume = await db.resume.findFirst({
      where: { id: resumeId, candidate_user_id: userId },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    await db.resume.delete({ where: { id: resumeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESUME_VERSIONS_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete resume version" },
      { status: 500 }
    );
  }
}

export { MAX_RESUMES };
