import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/sharing
 *
 * Returns the candidate's share requests + active shares.
 *
 * For share requests that include `requested_documents` (specific credential
 * names like "BLS (Basic Life Support)"), this endpoint ALSO auto-matches
 * each requested document against the candidate's credential vault and
 * returns the match status so the UI can pre-fill the approval form.
 *
 * Response shape for shareRequests[].requestedDocumentMatches:
 *   [
 *     {
 *       documentName: "BLS (Basic Life Support)",
 *       matched: true,
 *       credentialId: 42,
 *       uploadedAt: "2026-01-12T...",
 *       status: "active"
 *     },
 *     {
 *       documentName: "ACLS (Advanced Cardiovascular Life Support)",
 *       matched: false,
 *       credentialId: null,
 *       uploadedAt: null,
 *       status: null
 *     }
 *   ]
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;

    if (userRole === "candidate") {
      const shareRequests = await db.shareRequest.findMany({
        where: { candidate_user_id: userId },
        include: {
          client_user: {
            select: {
              first_name: true,
              last_name: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      const activeShares = await db.consentShare.findMany({
        where: {
          candidate_user_id: userId,
          is_deleted: false,
        },
        include: {
          client_user: {
            select: {
              first_name: true,
              last_name: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { shared_at: "desc" },
      });

      // ── Auto-match requested documents against candidate's credentials ──
      // Fetch all candidate's credentials once (not per-request) for efficiency
      const candidateCredentials = await db.credential.findMany({
        where: { candidate_user_id: userId },
        select: {
          id: true,
          document_name: true,
          uploaded_at: true,
          status: true,
        },
        orderBy: { uploaded_at: "desc" },
      });

      const shareRequestsWithMatches = shareRequests.map((req) => {
        // Parse requested_documents JSON (null for legacy requests)
        let requestedDocs: string[] = [];
        if (req.requested_documents) {
          try {
            requestedDocs = JSON.parse(req.requested_documents);
          } catch {
            requestedDocs = [];
          }
        }

        // For each requested document name, find a matching credential
        const requestedDocumentMatches = requestedDocs.map((docName) => {
          const match = candidateCredentials.find(
            (c) =>
              c.document_name.toLowerCase() === docName.toLowerCase() ||
              c.document_name.toLowerCase().includes(docName.toLowerCase()) ||
              docName.toLowerCase().includes(c.document_name.toLowerCase())
          );
          return {
            documentName: docName,
            matched: !!match,
            credentialId: match?.id ?? null,
            uploadedAt: match?.uploaded_at ?? null,
            status: match?.status ?? null,
          };
        });

        return {
          ...req,
          requested_documents: requestedDocs,
          requestedDocumentMatches,
        };
      });

      return NextResponse.json({
        shareRequests: shareRequestsWithMatches,
        activeShares,
      });
    }

    return NextResponse.json({ shareRequests: [], activeShares: [] });
  } catch (error) {
    console.error("Sharing GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sharing data" },
      { status: 500 }
    );
  }
}
