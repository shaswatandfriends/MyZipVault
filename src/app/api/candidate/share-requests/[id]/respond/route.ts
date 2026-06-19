import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { onDocShared, onDocDenied } from "@/lib/bob/status-engine";
import { findLeadByCandidateUserId } from "@/lib/bob/lead-finder";

/**
 * POST /api/candidate/share-requests/[id]/respond
 *
 * Candidate responds to a share request for a specific document type.
 *
 * Body:
 *   - docType: "credential" | "resume" | "checklist" | "reference"
 *   - action: "share_existing" | "deny"
 *   - credentialId?: number (required if action=share_existing and docType=credential)
 *   - resumeId?: number (required if action=share_existing and docType=resume)
 *
 * Behavior:
 *   - share_existing: Creates a ConsentShare record linking the candidate's
 *     existing credential/resume to the requesting recruiter. The recruiter
 *     can now view the document.
 *   - deny: Marks the share request status as "denied" (if all requested
 *     types are denied). The recruiter can request again later.
 *
 * Both actions fire the BOB status engine so the lead timeline updates:
 *   - share_existing → onDocUploaded (logs "Document shared: BLS")
 *   - deny → onDocDenied (logs "Document denied: BLS")
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const body = await request.json();
    const { docType, action, credentialId, resumeId } = body;

    if (!docType || !action) {
      return NextResponse.json(
        { error: "docType and action are required" },
        { status: 400 },
      );
    }

    if (!["credential", "resume", "checklist", "reference"].includes(docType)) {
      return NextResponse.json(
        { error: `Invalid docType: ${docType}` },
        { status: 400 },
      );
    }

    if (!["share_existing", "deny"].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 },
      );
    }

    // Fetch the share request + verify ownership
    const shareRequest = await db.shareRequest.findUnique({
      where: { id: requestId },
      include: {
        client_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    if (!shareRequest) {
      return NextResponse.json({ error: "Share request not found" }, { status: 404 });
    }

    if (shareRequest.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Not your request" }, { status: 403 });
    }

    if (shareRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Request already ${shareRequest.status}` },
        { status: 400 },
      );
    }

    // ─── Handle the response ──────────────────────────────────────
    if (action === "share_existing") {
      // Validate the credential/resume belongs to this candidate
      let credentialIdToShare: number | null = null;
      let resumeIdToShare: number | null = null;

      if (docType === "credential") {
        if (!credentialId) {
          return NextResponse.json(
            { error: "credentialId is required to share a credential" },
            { status: 400 },
          );
        }
        const credential = await db.credential.findFirst({
          where: { id: Number(credentialId), candidate_user_id: userId },
        });
        if (!credential) {
          return NextResponse.json(
            { error: "Credential not found in your vault" },
            { status: 404 },
          );
        }
        credentialIdToShare = credential.id;
      } else if (docType === "resume") {
        if (!resumeId) {
          // Try to find the candidate's resume
          const resume = await db.resume.findFirst({
            where: { candidate_user_id: userId },
          });
          if (!resume) {
            return NextResponse.json(
              { error: "You don't have a resume in your vault" },
              { status: 404 },
            );
          }
          resumeIdToShare = resume.id;
        } else {
          const resume = await db.resume.findFirst({
            where: { id: Number(resumeId), candidate_user_id: userId },
          });
          if (!resume) {
            return NextResponse.json(
              { error: "Resume not found in your vault" },
              { status: 404 },
            );
          }
          resumeIdToShare = resume.id;
        }
      }

      // Create the ConsentShare record (expires in 30 days)
      await db.consentShare.create({
        data: {
          candidate_user_id: userId,
          client_user_id: shareRequest.client_user_id,
          credential_id: credentialIdToShare,
          resume_id: resumeIdToShare,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // ─── Fire BOB status engine hook (non-blocking) ───────────
      // Log "Document shared" to the lead's timeline
      try {
        const lead = await findLeadByCandidateUserId(userId);
        if (lead) {
          const docName = docType === "credential"
            ? (await db.credential.findUnique({ where: { id: credentialIdToShare! } }))?.document_name || docType
            : docType;

          await onDocShared({
            leadId: lead.id,
            docType,
            docName: docName || docType,
          });
        }
      } catch (bobErr) {
        console.error("[BOB HOOK] Failed to fire doc-shared hook:", bobErr);
      }

      return NextResponse.json({
        success: true,
        action: "shared",
        message: `Your ${docType} has been shared with ${shareRequest.client_user.organization?.name || "the recruiter"}.`,
      });
    }

    // action === "deny"
    // Check if this was the last pending doc type in the request
    // If so, mark the entire request as "denied"
    // For now, we mark the request as "denied" (simplified — we don't track
    // per-doc-type status, just the overall request)
    await db.shareRequest.update({
      where: { id: requestId },
      data: { status: "denied" },
    });

    // ─── Fire BOB status engine hook (non-blocking) ─────────────
    try {
      const lead = await findLeadByCandidateUserId(userId);
      if (lead) {
        await onDocDenied({
          leadId: lead.id,
          docType,
        });
      }
    } catch (bobErr) {
      console.error("[BOB HOOK] Failed to fire doc-denied hook:", bobErr);
    }

    return NextResponse.json({
      success: true,
      action: "denied",
      message: `You denied the request for ${docType}. The recruiter can request again later.`,
    });
  } catch (error: any) {
    console.error("[SHARE_REQUEST_RESPOND] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to respond to request" },
      { status: 500 },
    );
  }
}
