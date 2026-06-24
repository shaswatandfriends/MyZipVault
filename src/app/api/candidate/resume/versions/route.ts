import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: List all resume versions for the candidate
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
        version_name: true,
        is_active: true,
        is_builder_resume: true,
        template_id: true,
        ats_score: true,
        file_url: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ versions: resumes });
  } catch (error) {
    console.error("[RESUME_VERSIONS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch resume versions" }, { status: 500 });
  }
}

// POST: Create a new resume version
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const body = await request.json();
    const { version_name, parsed_data, template_id, from_resume_id } = body;

    // If creating from an existing resume, copy its data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let copyData: any = null;
    if (from_resume_id) {
      copyData = await db.resume.findUnique({
        where: { id: Number(from_resume_id) },
        select: { parsed_data: true, file_url: true, is_builder_resume: true },
      });
    }

    // Deactivate all existing versions
    await db.resume.updateMany({
      where: { candidate_user_id: userId },
      data: { is_active: false },
    });

    // Create new version
    const resume = await db.resume.create({
      data: {
        candidate_user_id: userId,
        version_name: version_name || "New Version",
        is_builder_resume: copyData?.is_builder_resume ?? true,
        parsed_data: parsed_data || copyData?.parsed_data || null,
        file_url: copyData?.file_url || null,
        template_id: template_id || null,
        is_active: true,
      },
    });

    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    console.error("[RESUME_VERSIONS_POST]", error);
    return NextResponse.json({ error: "Failed to create resume version" }, { status: 500 });
  }
}
