import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    // Check credit balance
    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org || org.credits_balance < 1) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
    }

    // Determine entity type and ID
    let entityType = "other";
    let entityId = consentShareId;

    if (consentShare.checklist_response_id) {
      entityType = "checklist";
      entityId = consentShare.checklist_response_id;
    } else if (consentShare.credential_id) {
      entityType = "credential";
      entityId = consentShare.credential_id;
    } else if (consentShare.resume_id) {
      entityType = "resume";
      entityId = consentShare.resume_id;
    } else if (consentShare.reference_id) {
      entityType = "reference";
      entityId = consentShare.reference_id;
    }

    // Deduct credit
    await db.organization.update({
      where: { id: organizationId },
      data: { credits_balance: org.credits_balance - 1 },
    });

    // Create credit transaction
    const candidate = await db.user.findUnique({
      where: { id: candidateId },
      select: { first_name: true, last_name: true },
    });

    await db.creditTransaction.create({
      data: {
        organization_id: organizationId,
        transaction_type: "deduction",
        credit_amount: -1,
        description: `Unlock ${entityType} for ${candidate?.first_name ?? ""} ${candidate?.last_name ?? ""}`,
      },
    });

    // Create unlocked document record
    const unlockedDoc = await db.unlockedDocument.create({
      data: {
        client_user_id: userId,
        consent_share_id: consentShare.id,
        entity_type: entityType,
        entity_id: entityId,
        credits_charged: 1,
      },
    });

    return NextResponse.json({
      success: true,
      unlockedDocumentId: unlockedDoc.id,
      creditsCharged: 1,
      newBalance: org.credits_balance - 1,
    });
  } catch (error) {
    console.error("Unlock document POST error:", error);
    return NextResponse.json(
      { error: "Failed to unlock document" },
      { status: 500 }
    );
  }
}
