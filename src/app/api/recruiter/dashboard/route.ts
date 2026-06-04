import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
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

    // Get all checklist requests from this organization's recruiters
    const orgUsers = await db.user.findMany({
      where: { organization_id: organizationId, role: { in: ["client_recruiter", "client_admin"] } },
      select: { id: true },
    });
    const orgUserIds = orgUsers.map((u) => u.id);

    const checklistRequests = await db.checklistRequest.findMany({
      where: { client_user_id: { in: orgUserIds } },
      include: {
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            last_activity_at: true,
            candidate_profile: { select: { phone: true } },
          },
        },
        checklist_template: {
          select: { id: true, name: true, profession: true, specialty: true },
        },
        candidate_response: {
          select: { id: true, status: true, submitted_at: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Get consent shares for these candidates
    const candidateIds = [...new Set(checklistRequests.map((cr) => cr.candidate_user_id))];
    const consentShares = await db.consentShare.findMany({
      where: {
        candidate_user_id: { in: candidateIds },
        client_user_id: { in: orgUserIds },
        is_deleted: false,
      },
      include: {
        unlocked_documents: true,
        checklist_response: { select: { id: true } },
        credential: { select: { id: true, document_name: true } },
        resume: { select: { id: true } },
        reference: { select: { id: true, facility_name: true } },
      },
    });

    // Build candidate map with compliance status
    const candidateMap = new Map<number, {
      id: number;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
      lastActivity: Date | null;
      specialty: string;
      checklistRequests: typeof checklistRequests;
      sharedDocuments: typeof consentShares;
    }>();

    for (const cr of checklistRequests) {
      const cId = cr.candidate_user_id;
      if (!candidateMap.has(cId)) {
        candidateMap.set(cId, {
          id: cId,
          firstName: cr.candidate_user.first_name,
          lastName: cr.candidate_user.last_name,
          email: cr.candidate_user.email,
          phone: cr.candidate_user.candidate_profile?.phone ?? null,
          lastActivity: cr.candidate_user.last_activity_at,
          specialty: cr.checklist_template.specialty,
          checklistRequests: [],
          sharedDocuments: [],
        });
      }
      candidateMap.get(cId)!.checklistRequests.push(cr);
    }

    // Attach shared documents to candidates
    for (const share of consentShares) {
      const candidate = candidateMap.get(share.candidate_user_id);
      if (candidate) {
        candidate.sharedDocuments.push(share);
      }
    }

    // Determine compliance status for each candidate
    const candidates = Array.from(candidateMap.values()).map((c) => {
      const requests = c.checklistRequests;
      let complianceStatus: "compliant" | "pending" | "non_compliant" = "pending";

      if (requests.length === 0) {
        complianceStatus = "non_compliant";
      } else {
        const allCompleted = requests.every((r) => r.status === "completed");
        const anyInProgress = requests.some((r) => ["in_progress", "opened"].includes(r.status));
        const anySent = requests.some((r) => r.status === "sent");

        if (allCompleted) {
          complianceStatus = "compliant";
        } else if (anyInProgress || (anySent && requests.some((r) => r.status !== "sent"))) {
          complianceStatus = "pending";
        } else if (anySent) {
          complianceStatus = "non_compliant";
        }
      }

      const sharedDocs = c.sharedDocuments.map((s) => {
        const isUnlocked = s.unlocked_documents.length > 0;
        let docType = "other";
        let docName = "Document";

        if (s.checklist_response_id) { docType = "checklist"; docName = "Skills Checklist"; }
        else if (s.credential_id && s.credential) { docType = "credential"; docName = s.credential.document_name; }
        else if (s.resume_id) { docType = "resume"; docName = "Resume"; }
        else if (s.reference_id && s.reference) { docType = "reference"; docName = `Reference - ${s.reference.facility_name}`; }

        return {
          id: s.id,
          type: docType,
          name: docName,
          isUnlocked,
          sharedAt: s.shared_at,
        };
      });

      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        specialty: c.specialty,
        complianceStatus,
        lastActivity: c.lastActivity,
        sharedDocuments: sharedDocs,
        checklistRequestCount: requests.length,
        latestRequestStatus: requests[0]?.status ?? null,
        latestRequestDate: requests[0]?.created_at ?? null,
      };
    });

    // Stats
    const totalCandidates = candidates.length;
    const pendingRequests = checklistRequests.filter((r) => r.status === "sent").length;
    const completedPackets = checklistRequests.filter((r) => r.status === "completed").length;

    // Credits used this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const creditsUsedThisMonth = await db.creditTransaction.aggregate({
      _sum: { credit_amount: true },
      where: {
        organization_id: organizationId,
        transaction_type: "deduction",
        created_at: { gte: startOfMonth },
      },
    });

    // Organization info
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { credits_balance: true, baa_status: true, name: true },
    });

    return NextResponse.json({
      candidates,
      stats: {
        totalCandidates,
        pendingRequests,
        completedPackets,
        creditsUsedThisMonth: Math.abs(creditsUsedThisMonth._sum.credit_amount ?? 0),
        creditsBalance: organization?.credits_balance ?? 0,
        baaStatus: organization?.baa_status ?? "pending",
      },
      organization: {
        name: organization?.name ?? "",
        creditsBalance: organization?.credits_balance ?? 0,
      },
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
