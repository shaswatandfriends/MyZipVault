import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { MAX_RESUMES } from "./versions/route";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

/**
 * POST /api/candidate/resume
 *
 * Upload a new resume file (PDF/DOC/DOCX). Enforces the MAX_RESUMES
 * limit — if the candidate already has 3 resumes, returns 400 with a
 * message telling them to delete one first.
 */
export async function POST(request: Request) {
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

    // ── Enforce the version limit ──
    const count = await db.resume.count({ where: { candidate_user_id: userId } });
    if (count >= MAX_RESUMES) {
      return NextResponse.json(
        {
          error: `You can only have ${MAX_RESUMES} resume versions. Delete one before uploading a new one.`,
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // ── Validate file size ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // ── Validate extension ──
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = safeFileName.toLowerCase().slice(safeFileName.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Upload to Supabase Storage ──
    const buffer = Buffer.from(await file.arrayBuffer());
    const { v4: uuidv4 } = await import("uuid");
    const uniqueName = `${uuidv4()}${ext}`;
    const uploadResult = await uploadFile(
      "resumes",
      `candidate-${userId}`,
      buffer,
      uniqueName,
      file.type || "application/octet-stream"
    );

    // ── Create resume row ──
    const resume = await db.resume.create({
      data: {
        candidate_user_id: userId,
        file_url: uploadResult.url,
        is_builder_resume: false,
      },
    });

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
    console.error("[RESUME_POST]", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
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
