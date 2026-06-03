import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and Word documents are accepted" },
        { status: 400 }
      );
    }

    // Store file as base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "application/octet-stream";
    const fileUrl = `data:${mimeType};base64,${base64}`;

    // Delete existing resume if any
    const existing = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    if (existing) {
      await db.resume.update({
        where: { id: existing.id },
        data: {
          file_url: fileUrl,
          is_builder_resume: false,
          parsed_data: null,
        },
      });

      return NextResponse.json({
        resume: {
          id: existing.id,
          fileUrl: fileUrl,
          isBuilderResume: false,
          createdAt: existing.created_at,
          filename: file.name,
        },
      });
    }

    const resume = await db.resume.create({
      data: {
        candidate_user_id: userId,
        file_url: fileUrl,
        is_builder_resume: false,
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
          fileUrl: fileUrl,
          isBuilderResume: false,
          createdAt: resume.created_at,
          filename: file.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
      { status: 500 }
    );
  }
}
