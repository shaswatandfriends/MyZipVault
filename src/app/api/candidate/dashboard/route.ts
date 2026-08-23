import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalcProfileCompletion } from "@/lib/profile-completion";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ─── Fetch user first (needed for email in VaultSign query) ──────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email_verified_at: true, email: true, first_name: true, last_name: true },
    });

    // ─── Parallelize independent queries ──────────────────────────────
    // All of these are independent — fetch them in a single round-trip
    // via Promise.allSettled so a single failing query (e.g., a missing
    // column after a partial migration) doesn't 500 the WHOLE dashboard.
    // Failed queries fall back to safe defaults (empty arrays / null).
    const [
      profileResult,
      credentialsResult,
      referencesResult,
      resumeResult,
      notificationsResult,
      vaultSignResult,
      shareRequestsResult,
      calendarResult,
      checklistResponsesResult,
    ] = await Promise.allSettled([
      db.candidateProfile.findUnique({
        where: { user_id: userId },
      }),
      db.credential.findMany({
        where: { candidate_user_id: userId },
        orderBy: { uploaded_at: "desc" },
      }),
      db.candidateReference.findMany({
        where: { candidate_user_id: userId },
      }),
      db.resume.findFirst({
        where: { candidate_user_id: userId },
      }),
      db.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 8,
      }),
      db.vaultSignSigner.findMany({
        where: { OR: [{ user_id: userId }, { email: user?.email ?? "" }] },
        select: { status: true },
      }),
      db.shareRequest.findMany({
        where: { candidate_user_id: userId, status: "pending" },
        select: { id: true, request_checklists: true, request_credentials: true, request_resume: true, request_references: true },
      }),
      db.calendarAvailability.findMany({
        where: { candidate_user_id: userId },
        take: 1,
        select: { id: true },
      }),
      db.candidateChecklistResponse.count({
        where: {
          candidate_user_id: userId,
          status: "active",
          valid_until: { gte: new Date() },
        },
      }),
    ]);

    // Resolve settled results with safe fallbacks
    const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
    if (profileResult.status === "rejected") {
      console.error("[DASHBOARD] candidateProfile query failed:", profileResult.reason);
    }
    const allCredentials = credentialsResult.status === "fulfilled" ? credentialsResult.value : [];
    if (credentialsResult.status === "rejected") {
      console.error("[DASHBOARD] credential query failed:", credentialsResult.reason);
    }
    const references = referencesResult.status === "fulfilled" ? referencesResult.value : [];
    if (referencesResult.status === "rejected") {
      console.error("[DASHBOARD] candidateReference query failed:", referencesResult.reason);
    }
    const resume = resumeResult.status === "fulfilled" ? resumeResult.value : null;
    if (resumeResult.status === "rejected") {
      console.error("[DASHBOARD] resume query failed:", resumeResult.reason);
    }
    const notifications = notificationsResult.status === "fulfilled" ? notificationsResult.value : [];
    if (notificationsResult.status === "rejected") {
      console.error("[DASHBOARD] notification query failed:", notificationsResult.reason);
    }
    const vaultSignSigners = vaultSignResult.status === "fulfilled" ? vaultSignResult.value : [];
    if (vaultSignResult.status === "rejected") {
      console.error("[DASHBOARD] vaultSignSigner query failed:", vaultSignResult.reason);
    }
    const shareRequests = shareRequestsResult.status === "fulfilled" ? shareRequestsResult.value : [];
    if (shareRequestsResult.status === "rejected") {
      console.error("[DASHBOARD] shareRequest query failed:", shareRequestsResult.reason);
    }
    const calendarAvailabilities = calendarResult.status === "fulfilled" ? calendarResult.value : [];
    if (calendarResult.status === "rejected") {
      console.error("[DASHBOARD] calendarAvailability query failed:", calendarResult.reason);
    }
    const checklistResponses = checklistResponsesResult.status === "fulfilled" ? checklistResponsesResult.value : 0;
    if (checklistResponsesResult.status === "rejected") {
      console.error("[DASHBOARD] candidateChecklistResponse query failed:", checklistResponsesResult.reason);
    }

    // ─── Derived data ─────────────────────────────────────────────────
    const activeCredentials = allCredentials.filter(
      (c) => c.verification_status === "verified" || c.verification_status === "pending_review"
    );
    const topCredentialItems = allCredentials.slice(0, 4).map((c) => ({
      id: c.id,
      documentName: c.document_name,
      status: c.status,
      verificationStatus: c.verification_status,
      expirationDate: c.expiration_date,
    }));
    const completedReferences = references.filter((r) => r.status === "completed");
    const pendingReferences = references.filter((r) => r.status === "pending" || r.status === "pending_request");
    const vaultSignPending = vaultSignSigners.filter(
      (s) => s.status === "sent" || s.status === "viewed" || s.status === "pending"
    ).length;
    const vaultSignSigned = vaultSignSigners.filter((s) => s.status === "signed").length;
    const hasCalendar = calendarAvailabilities.length > 0;

    // ─── Checklists — separate query (includes relations) ─────────────
    // Kept separate from Promise.all because it has nested includes that
    // benefit from Prisma's join optimization.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let checklists: any[] = [];
    try {
      checklists = await db.checklistRequest.findMany({
        where: { candidate_user_id: userId },
        include: {
          checklist_template: { select: { name: true } },
          client_user: { select: { first_name: true, last_name: true, organization: { select: { name: true } } } },
        },
        orderBy: { created_at: "desc" },
      });
    } catch (checklistErr) {
      console.error("[DASHBOARD] Checklist query failed:", checklistErr);
    }

    const completedChecklists = checklists.filter((c) => c.status === "completed");
    const pendingChecklists = checklists.filter(
      (c) => c.status === "sent" || c.status === "reuse_pending" || c.status === "opened" || c.status === "in_progress"
    );

    // ─── Profile completion — use the CANONICAL source of truth ──────
    // recalcProfileCompletion() is the single source of truth used across
    // the entire app. It also updates the stored profile_completion_pct
    // column so other pages see the same value.
    let profileCompletionPct = profile?.profile_completion_pct ?? 0;
    try {
      const recalced = await recalcProfileCompletion(userId);
      if (recalced !== null) profileCompletionPct = recalced;
    } catch (e) {
      console.error("[DASHBOARD] recalcProfileCompletion failed:", e);
      // Fall back to the stored column value
    }

    // ─── Pending item count (actual items, not categories) ───────────
    // This counts the real number of actionable items the candidate needs
    // to address: each pending checklist + each VaultSign doc + each
    // pending reference + each pending share request.
    const pendingItemCount =
      pendingChecklists.length +
      vaultSignPending +
      pendingReferences.length +
      shareRequests.length;

    return NextResponse.json({
      profile: profile
        ? {
            firstName: profile.first_name,
            profileCompletionPct,
          }
        : null,
      resume: resume ? { fileUrl: resume.file_url } : null,
      credentials: {
        total: allCredentials.length,
        active: activeCredentials.length,
        verified: allCredentials.filter((c) => c.verification_status === "verified").length,
        topItems: topCredentialItems,
      },
      checklists: {
        total: checklists.length,
        completed: completedChecklists.length,
        pending: pendingChecklists.length,
      },
      references: {
        total: references.length,
        completed: completedReferences.length,
        pending: pendingReferences.length,
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
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        createdAt: n.created_at,
        relatedEntityType: n.related_entity_type,
      })),
      emailVerified: !!user?.email_verified_at,
      hasCalendar,
      hasActiveChecklistResponse: checklistResponses > 0,
      pendingItemCount, // actual count of actionable items (not categories)
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
