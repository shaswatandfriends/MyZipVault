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
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email_verified_at: true, email: true, first_name: true, last_name: true },
    });

    const profile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
    });

    const credentials = await db.credential.findMany({
      where: { candidate_user_id: userId },
      orderBy: { uploaded_at: "desc" },
      take: 4,
    });

    const allCredentials = await db.credential.findMany({
      where: { candidate_user_id: userId },
    });

    const activeCredentials = allCredentials.filter(
      (c) => c.verification_status === "verified" || c.verification_status === "pending_review"
    );

    // Checklists — wrapped in its own try/catch so a schema mismatch
    // (e.g. new expires_at / superseded_by_id columns not yet migrated)
    // doesn't take down the entire dashboard. Falls back to empty list.
    let checklists: Awaited<ReturnType<typeof db.checklistRequest.findMany>> = [];
    try {
      checklists = await db.checklistRequest.findMany({
        where: { candidate_user_id: userId },
        include: {
          checklist_template: { select: { name: true } },
          client_user: { select: { first_name: true, last_name: true, organization: { select: { name: true } } } },
          candidate_response: {
            include: { skill_ratings: true },
          },
        },
        orderBy: { created_at: "desc" },
      });
    } catch (checklistErr) {
      console.error("[DASHBOARD] Checklist query failed (schema mismatch?):", checklistErr);
    }

    const completedChecklists = checklists.filter((c) => c.status === "completed");
    const pendingChecklists = checklists.filter((c) => c.status === "sent" || c.status === "reuse_pending");

    const references = await db.candidateReference.findMany({
      where: { candidate_user_id: userId },
    });
    const completedReferences = references.filter((r) => r.status === "completed");

    const resume = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    const notifications = await db.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 8,
    });

    // Profile completion
    const hasProfileInfo = !!(profile?.first_name && profile?.last_name && profile?.phone);
    const hasEmailVerified = !!user?.email_verified_at;
    const hasResume = !!resume?.file_url;
    const hasCredential = allCredentials.length > 0;
    const hasReference = completedReferences.length > 0;
    const calendarAvailabilities = await db.calendarAvailability.findMany({
      where: { candidate_user_id: userId },
      take: 1,
      select: { id: true },
    });
    const hasCalendar = calendarAvailabilities.length > 0;

    const profileCompletion =
      (hasProfileInfo ? 20 : 0) +
      (hasEmailVerified ? 15 : 0) +
      (hasResume ? 25 : 0) +
      (hasCredential ? 15 : 0) +
      (hasReference ? 15 : 0) +
      (hasCalendar ? 10 : 0);

    // VaultSign
    const vaultSignSigners = await db.vaultSignSigner.findMany({
      where: { OR: [{ user_id: userId }, { email: user?.email }] },
      select: { status: true },
    });
    const vaultSignPending = vaultSignSigners.filter(
      (s) => s.status === "sent" || s.status === "viewed" || s.status === "pending"
    ).length;
    const vaultSignSigned = vaultSignSigners.filter((s) => s.status === "signed").length;

    // Share requests (pending)
    const shareRequests = await db.shareRequest.findMany({
      where: { candidate_user_id: userId, status: "pending" },
      select: { id: true },
    });

    return NextResponse.json({
      profile: profile
        ? { firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone, profileCompletionPct: profileCompletion }
        : null,
      resume: resume ? { id: resume.id, fileUrl: resume.file_url } : null,
      credentials: {
        total: allCredentials.length,
        active: activeCredentials.length,
        topItems: credentials.map((c) => ({
          id: c.id,
          documentName: c.document_name,
          status: c.status,
          verificationStatus: c.verification_status,
          expirationDate: c.expiration_date,
        })),
      },
      checklists: {
        total: checklists.length,
        completed: completedChecklists.length,
        pending: pendingChecklists.length,
      },
      references: {
        total: references.length,
        completed: completedReferences.length,
      },
      vaultsign: {
        pending: vaultSignPending,
        signed: vaultSignSigned,
        total: vaultSignSigners.length,
      },
      pendingChecklistRequests: pendingChecklists.map((c) => ({
        id: c.id,
        checklistName: c.checklist_template.name,
        status: c.status,
        createdAt: c.created_at,
        assignedBy: c.client_user
          ? `${c.client_user.first_name ?? ""} ${c.client_user.last_name ?? ""}`.trim() ||
            c.client_user.organization?.name ||
            "Recruiter"
          : "Recruiter",
      })),
      shareRequestCount: shareRequests.length,
      notifications: notifications.map((n) => ({
        id: n.id,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
      emailVerified: !!user?.email_verified_at,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
