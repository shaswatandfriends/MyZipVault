import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/candidates/[id]/rtr-status
 *
 * Checks the RTR (Right to Represent) status for a candidate.
 *
 * Returns:
 *   - has_rtr: boolean (true if any RTR exists for this candidate by this recruiter's org)
 *   - rtr_status: 'none' | 'sent' | 'viewed' | 'signed' | 'expired' | 'declined'
 *   - document_id: number | null
 *   - signed_at: string | null (ISO date when candidate signed)
 *   - expires_at: string | null (when the RTR document expires)
 *   - can_submit: boolean (true if RTR is signed and not expired)
 *
 * Auth: client_recruiter or client_admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizationId = (session.user as Record<string, unknown>).organization_id as number | undefined;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const candidateRecordId = parseInt(id, 10);
    if (isNaN(candidateRecordId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    // Get candidate's email
    const candidate = await db.candidateRecord.findUnique({
      where: { id: candidateRecordId },
      include: {
        contact_info: {
          where: { deleted_at: null, type: "email" },
          orderBy: { added_at: "desc" },
          take: 1,
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidateEmail = candidate.contact_info[0]?.value;
    if (!candidateEmail) {
      return NextResponse.json({
        has_rtr: false,
        rtr_status: "no_email",
        can_submit: false,
        message: "Candidate has no email on file — cannot send RTR",
      });
    }

    // Find the most recent RTR document sent to this candidate by this org
    const rtrDocument = await db.vaultSignDocument.findFirst({
      where: {
        organization_id: organizationId,
        document_type: "right_to_represent",
        signers: {
          some: {
            email: candidateEmail,
            role: "Candidate",
          },
        },
      },
      include: {
        signers: {
          where: { email: candidateEmail, role: "Candidate" },
          take: 1,
        },
      },
      orderBy: { created_at: "desc" },
    });

    if (!rtrDocument) {
      return NextResponse.json({
        has_rtr: false,
        rtr_status: "none",
        can_submit: false,
        document_id: null,
        signed_at: null,
        expires_at: null,
      });
    }

    const signer = rtrDocument.signers[0];
    const now = new Date();
    const isExpired = rtrDocument.expiry_date < now;
    const isSigned = signer?.status === "signed" || rtrDocument.status === "completed";

    let rtrStatus = "none";
    if (isSigned) {
      rtrStatus = "signed";
    } else if (signer?.status === "declined" || rtrDocument.status === "declined") {
      rtrStatus = "declined";
    } else if (isExpired || rtrDocument.status === "expired") {
      rtrStatus = "expired";
    } else if (signer?.status === "viewed") {
      rtrStatus = "viewed";
    } else if (signer?.status === "sent" || rtrDocument.status === "sent") {
      rtrStatus = "sent";
    }

    return NextResponse.json({
      has_rtr: true,
      rtr_status: rtrStatus,
      can_submit: rtrStatus === "signed",
      document_id: rtrDocument.id,
      document_public_id: rtrDocument.public_id,
      signer_id: signer?.id ?? null,
      signed_at: signer?.signed_at ?? null,
      expires_at: rtrDocument.expiry_date.toISOString(),
      document_name: rtrDocument.document_name,
    });
  } catch (error) {
    console.error("[RTR_STATUS]", error);
    return NextResponse.json({ error: "Failed to check RTR status" }, { status: 500 });
  }
}
