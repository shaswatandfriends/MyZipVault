import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/candidate/share-requests
 *
 * Returns all pending share requests for the logged-in candidate, plus
 * their vault credentials (so the frontend can show the "Existing" picker).
 *
 * Returns:
 *   - requests: ShareRequest[] with client_user + organization info
 *   - credentials: Credential[] (candidate's vault)
 *   - resume: Resume | null
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;

    if (role !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [requests, credentials, resume] = await Promise.all([
      // Pending share requests
      db.shareRequest.findMany({
        where: {
          candidate_user_id: userId,
          status: "pending",
        },
        orderBy: { created_at: "desc" },
        include: {
          client_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              organization: { select: { id: true, name: true } },
            },
          },
        },
      }),

      // Candidate's credentials (vault)
      db.credential.findMany({
        where: { candidate_user_id: userId },
        orderBy: { uploaded_at: "desc" },
        select: {
          id: true,
          document_name: true,
          file_url: true,
          expiration_date: true,
          status: true,
          verification_status: true,
          uploaded_at: true,
        },
      }),

      // Candidate's resume
      db.resume.findFirst({
        where: { candidate_user_id: userId },
        select: {
          id: true,
          file_url: true,
          is_builder_resume: true,
          created_at: true,
        },
      }),
    ]);

    return NextResponse.json({
      requests,
      credentials,
      resume,
    });
  } catch (error: any) {
    console.error("[SHARE_REQUESTS GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch share requests" },
      { status: 500 },
    );
  }
}
