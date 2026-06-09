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
      select: { email_verified_at: true, email: true },
    });

    const profile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
    });

    const credentials = await db.credential.findMany({
      where: { candidate_user_id: userId },
    });

    const activeCredentials = credentials.filter(
      (c) => c.verification_status === "verified" || c.verification_status === "pending_review"
    );

    const checklists = await db.checklistRequest.findMany({
      where: { candidate_user_id: userId },
      include: {
        checklist_template: { select: { name: true } },
        candidate_response: {
          include: { skill_ratings: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const completedChecklists = checklists.filter(
      (c) => c.status === "completed"
    );
    const pendingChecklists = checklists.filter(
      (c) => c.status === "sent"
    );

    const references = await db.candidateReference.findMany({
      where: { candidate_user_id: userId },
    });
    const completedReferences = references.filter(
      (r) => r.status === "completed"
    );

    const resume = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    const notifications = await db.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    const profileCompletion = profile?.profile_completion_pct ?? 0;

    // VaultSign stats - find signer records for this candidate
    const vaultSignSigners = await db.vaultSignSigner.findMany({
      where: {
        OR: [
          { user_id: userId },
          { email: user?.email },
        ],
      },
      select: { status: true },
    });
    const vaultSignPending = vaultSignSigners.filter(
      (s) => s.status === "sent" || s.status === "viewed" || s.status === "pending"
    ).length;
    const vaultSignSigned = vaultSignSigners.filter(
      (s) => s.status === "signed"
    ).length;

    return NextResponse.json({
      profile: profile
        ? {
            firstName: profile.first_name,
            lastName: profile.last_name,
            phone: profile.phone,
            profileCompletionPct: profileCompletion,
          }
        : null,
      resume: resume ? { id: resume.id, fileUrl: resume.file_url } : null,
      credentials: {
        total: credentials.length,
        active: activeCredentials.length,
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
      })),
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
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
