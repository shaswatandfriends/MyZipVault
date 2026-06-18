import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScopedClientUserIds, canRecruiterAccessCandidate } from "@/lib/recruiter-scope";

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
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const candidateId = Number(id);

    // Get candidate user
    const candidate = await db.user.findUnique({
      where: { id: candidateId, role: "candidate" },
      include: {
        candidate_profile: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // ─── Gap 1 fix: scope by user, not org ───
    // Individual recruiters see only their own candidates.
    // Client admins see all recruiters' candidates in their org.
    const scope = await getScopedClientUserIds(userRole, userId, organizationId);
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify this recruiter has access to this candidate
    const hasAccess = await canRecruiterAccessCandidate(
      userRole,
      userId,
      organizationId,
      candidateId
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this candidate" },
        { status: 403 }
      );
    }

    const checklistRequests = await db.checklistRequest.findMany({
      where: {
        candidate_user_id: candidateId,
        client_user_id: { in: scope.clientUserIds },
      },
      include: {
        checklist_template: {
          select: { id: true, name: true, profession: true, specialty: true },
        },
        candidate_response: {
          include: {
            skill_ratings: {
              include: {
                skill: { select: { skill_name: true, category: true, question_type: true, sort_order: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    if (checklistRequests.length === 0) {
      return NextResponse.json({ error: "No access to this candidate" }, { status: 403 });
    }

    // Get consent shares (shared documents) — scoped to this recruiter/admin's org
    const consentShares = await db.consentShare.findMany({
      where: {
        candidate_user_id: candidateId,
        client_user_id: { in: scope.clientUserIds },
        is_deleted: false,
      },
      include: {
        unlocked_documents: true,
        checklist_response: {
          select: { id: true, status: true, submitted_at: true },
        },
        credential: {
          select: { id: true, document_name: true, file_url: true, status: true, verification_status: true },
        },
        resume: {
          select: { id: true, file_url: true, is_builder_resume: true },
        },
        reference: {
          select: { id: true, facility_name: true, employment_status: true, status: true },
        },
      },
    });

    // Build documents list
    const documents = consentShares.map((share) => {
      const isUnlocked = share.unlocked_documents.length > 0;
      let docType = "other";
      let docName = "Document";
      let docDetails: Record<string, unknown> = {};

      if (share.checklist_response_id && share.checklist_response) {
        docType = "checklist";
        docName = "Skills Checklist";
        docDetails = {
          responseId: share.checklist_response.id,
          responseStatus: share.checklist_response.status,
          submittedAt: share.checklist_response.submitted_at,
        };
      } else if (share.credential_id && share.credential) {
        docType = "credential";
        docName = share.credential.document_name;
        docDetails = {
          credentialId: share.credential.id,
          status: share.credential.status,
          verificationStatus: share.credential.verification_status,
        };
      } else if (share.resume_id && share.resume) {
        docType = "resume";
        docName = share.resume.is_builder_resume ? "Builder Resume" : "Uploaded Resume";
        docDetails = {
          resumeId: share.resume.id,
        };
      } else if (share.reference_id && share.reference) {
        docType = "reference";
        docName = `Reference - ${share.reference.facility_name}`;
        docDetails = {
          referenceId: share.reference.id,
          employmentStatus: share.reference.employment_status,
          referenceStatus: share.reference.status,
        };
      }

      return {
        consentShareId: share.id,
        type: docType,
        name: docName,
        isUnlocked,
        sharedAt: share.shared_at,
        expiresAt: share.expires_at,
        details: docDetails,
        unlockedDocumentId: isUnlocked ? share.unlocked_documents[0].id : null,
      };
    });

    // Build pipeline progress from the most recent checklist request
    const latestRequest = checklistRequests[0];
    const pipeline = {
      sent: { completed: true, date: latestRequest.created_at },
      opened: { completed: !!latestRequest.opened_at, date: latestRequest.opened_at },
      inProgress: { completed: latestRequest.status === "in_progress" || latestRequest.status === "completed", date: latestRequest.opened_at, progress: latestRequest.completion_pct },
      completed: { completed: latestRequest.status === "completed", date: latestRequest.candidate_response?.submitted_at ?? null },
    };

    // Checklist progress details (skill ratings)
    let skillRatings: Array<{
      skillName: string;
      category: string;
      ratingValue: string | null;
      isNa: boolean;
      sortOrder: number;
    }> = [];

    if (latestRequest.candidate_response) {
      skillRatings = latestRequest.candidate_response.skill_ratings.map((sr) => ({
        skillName: sr.skill.skill_name,
        category: sr.skill.category,
        ratingValue: sr.rating_value,
        isNa: sr.is_na,
        sortOrder: sr.skill.sort_order,
      }));
    }

    return NextResponse.json({
      candidate: {
        id: candidate.id,
        email: candidate.email,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        phone: candidate.candidate_profile?.phone ?? candidate.phone,
        profileCompletion: candidate.candidate_profile?.profile_completion_pct ?? 0,
      },
      checklistRequests: checklistRequests.map((cr) => ({
        id: cr.id,
        templateName: cr.checklist_template.name,
        specialty: cr.checklist_template.specialty,
        profession: cr.checklist_template.profession,
        status: cr.status,
        completionPct: cr.completion_pct,
        createdAt: cr.created_at,
        openedAt: cr.opened_at,
      })),
      pipeline,
      documents,
      skillRatings,
      totalDocuments: documents.length,
      unlockedDocuments: documents.filter((d) => d.isUnlocked).length,
      lockedDocuments: documents.filter((d) => !d.isUnlocked).length,
    });
  } catch (error) {
    console.error("Candidate detail GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate details" },
      { status: 500 }
    );
  }
}
