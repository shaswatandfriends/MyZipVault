import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logRecruiterUnlocked } from "@/lib/audit";
import { checkCreditAccess, deductCredits } from "@/lib/credit-gating";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const candidateId = Number(id);

    const body = await request.json();
    const { consentShareId } = body;

    if (!consentShareId) {
      return NextResponse.json({ error: "consentShareId is required" }, { status: 400 });
    }

    // Verify the consent share exists and belongs to this candidate
    const consentShare = await db.consentShare.findUnique({
      where: { id: Number(consentShareId) },
      include: { unlocked_documents: true },
    });

    if (!consentShare || consentShare.candidate_user_id !== candidateId) {
      return NextResponse.json({ error: "Consent share not found" }, { status: 404 });
    }

    // Check if already unlocked
    if (consentShare.unlocked_documents.length > 0) {
      return NextResponse.json({ error: "Document already unlocked", alreadyUnlocked: true }, { status: 400 });
    }

    // Determine entity type for the feature gate check
    let featureName = "unlock_candidate";
    let entityType = "other";
    let entityId = consentShareId;

    if (consentShare.checklist_response_id) {
      entityType = "checklist";
      entityId = consentShare.checklist_response_id;
      featureName = "view_full_packet";
    } else if (consentShare.credential_id) {
      entityType = "credential";
      entityId = consentShare.credential_id;
      featureName = "view_credentials";
    } else if (consentShare.resume_id) {
      entityType = "resume";
      entityId = consentShare.resume_id;
      featureName = "view_resume";
    } else if (consentShare.reference_id) {
      entityType = "reference";
      entityId = consentShare.reference_id;
      featureName = "view_references";
    }

    // Use credit gating utility to check access
    const accessResult = await checkCreditAccess(organizationId, featureName);

    if (!accessResult.allowed) {
      return NextResponse.json(
        {
          error: accessResult.reason || "Insufficient credits",
          creditsRequired: accessResult.creditsRequired,
          currentBalance: accessResult.currentBalance,
        },
        { status: 403 }
      );
    }

    const creditsCharged = accessResult.creditsRequired;

    // Deduct credits using the utility
    const candidate = await db.user.findUnique({
      where: { id: candidateId },
      select: { first_name: true, last_name: true },
    });

    const { newBalance } = await deductCredits(
      organizationId,
      creditsCharged,
      `Unlock ${entityType} for ${candidate?.first_name ?? ""} ${candidate?.last_name ?? ""}`,
      userId
    );

    // Create unlocked document record
    const unlockedDoc = await db.unlockedDocument.create({
      data: {
        client_user_id: userId,
        consent_share_id: consentShare.id,
        entity_type: entityType,
        entity_id: entityId,
        credits_charged: creditsCharged,
      },
    });

    // Audit log
    await logRecruiterUnlocked(userId, entityType, entityId);

    return NextResponse.json({
      success: true,
      unlockedDocumentId: unlockedDoc.id,
      creditsCharged,
      newBalance,
    });
  } catch (error) {
    console.error("Unlock document POST error:", error);
    return NextResponse.json(
      { error: "Failed to unlock document" },
      { status: 500 }
    );
  }
}
