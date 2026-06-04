import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resume = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    if (!resume) {
      return NextResponse.json({ resume: null });
    }

    let parsedData = null;
    if (resume.parsed_data) {
      try {
        parsedData = JSON.parse(resume.parsed_data);
      } catch {
        parsedData = null;
      }
    }

    return NextResponse.json({
      resume: {
        id: resume.id,
        fileUrl: resume.file_url,
        isBuilderResume: resume.is_builder_resume,
        createdAt: resume.created_at,
        parsedData,
      },
    });
  } catch (error) {
    console.error("Resume GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { parsedData } = body;

    const existing = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    if (existing) {
      const updated = await db.resume.update({
        where: { id: existing.id },
        data: {
          is_builder_resume: true,
          parsed_data: parsedData ? JSON.stringify(parsedData) : null,
        },
      });

      return NextResponse.json({
        resume: {
          id: updated.id,
          fileUrl: updated.file_url,
          isBuilderResume: updated.is_builder_resume,
          createdAt: updated.created_at,
        },
      });
    }

    const resume = await db.resume.create({
      data: {
        candidate_user_id: userId,
        is_builder_resume: true,
        parsed_data: parsedData ? JSON.stringify(parsedData) : null,
      },
    });

    // Update candidate profile
    const profile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
    });
    if (profile) {
      await db.candidateProfile.update({
        where: { user_id: userId },
        data: { resume_id: resume.id },
      });
    }

    return NextResponse.json(
      {
        resume: {
          id: resume.id,
          fileUrl: resume.file_url,
          isBuilderResume: resume.is_builder_resume,
          createdAt: resume.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Resume PUT error:", error);
    return NextResponse.json(
      { error: "Failed to save resume" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "No resume found" }, { status: 404 });
    }

    // Clear profile resume reference first
    const profile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
    });
    if (profile && profile.resume_id === existing.id) {
      await db.candidateProfile.update({
        where: { user_id: userId },
        data: { resume_id: null },
      });
    }

    await db.resume.delete({ where: { id: existing.id } });

    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Resume DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 }
    );
  }
}
