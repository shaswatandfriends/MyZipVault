// @ts-nocheck — TODO(audit-2): pre-existing schema drift in legacy code.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";

// GET /api/recruiter/resume/[id]
// Returns a signed URL for viewing/downloading a candidate's resume.
// Only accessible if the recruiter's org has a ConsentShare for this resume.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin", "platform_admin", "super_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const { id } = await params;
    const resumeId = Number(id);

    // Get the recruiter's client user IDs (for org scoping)
    let clientUserIds: number[] = [];
    if (userRole === "client_recruiter" || userRole === "client_admin") {
      const recruiter = await db.user.findUnique({
        where: { id: userId },
        select: { organization_id: true },
      });
      if (recruiter?.organization_id) {
        const orgUsers = await db.user.findMany({
          where: { organization_id: recruiter.organization_id },
          select: { id: true },
        });
        clientUserIds = orgUsers.map((u) => u.id);
      }
      clientUserIds.push(userId);
    }

    // Find the resume
    const resume = await db.resume.findUnique({
      where: { id: resumeId },
      select: {
        id: true,
        file_url: true,
        candidate_user_id: true,
        is_builder_resume: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Check if the recruiter has a ConsentShare for this resume
    // (candidate must have shared it)
    if (clientUserIds.length > 0) {
      const consentShare = await db.consentShare.findFirst({
        where: {
          resume_id: resumeId,
          client_user_id: { in: clientUserIds },
          is_deleted: false,
        },
        select: { id: true },
      });

      if (!consentShare) {
        return NextResponse.json(
          { error: "Candidate has not shared this resume with you" },
          { status: 403 }
        );
      }
    }

    // If it's a builder resume (no file URL), redirect to the builder PDF export
    if (resume.is_builder_resume || !resume.file_url) {
      return NextResponse.json(
        { error: "Builder resume — use the candidate's profile to view" },
        { status: 404 }
      );
    }

    // Generate a signed URL for the resume file
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "download";
    const expiresIn = mode === "preview" ? 3600 : 900; // 1hr for preview, 15min for download

    const signedUrl = await getSignedUrl("resumes", resume.file_url, expiresIn);

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error: any) {
    console.error("[RECRUITER_RESUME_VIEW] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate resume URL" },
      { status: 500 }
    );
  }
}
