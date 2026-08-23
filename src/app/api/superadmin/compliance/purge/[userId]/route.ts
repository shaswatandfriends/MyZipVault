import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAccountPurged } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const adminUserId = Number((session.user as Record<string, unknown>).id);

    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const targetUserId = parseInt(userId);

    const user = await db.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log audit trail before deletion
    await logAccountPurged(adminUserId, targetUserId);

    // Delete all related data (immediate purge, no 30-day wait)
    await db.skillRating.deleteMany({
      where: { checklist_response: { candidate_user_id: targetUserId } },
    });
    await db.candidateChecklistResponse.deleteMany({
      where: { candidate_user_id: targetUserId },
    });
    await db.referenceResponse.deleteMany({
      where: { candidate_reference: { candidate_user_id: targetUserId } },
    });
    await db.candidateReference.deleteMany({
      where: { candidate_user_id: targetUserId },
    });
    await db.candidateProfile.deleteMany({
      where: { user_id: targetUserId },
    });
    await db.credential.deleteMany({
      where: { candidate_user_id: targetUserId },
    });
    await db.resume.deleteMany({
      where: { candidate_user_id: targetUserId },
    });
    await db.consentShare.deleteMany({
      where: { candidate_user_id: targetUserId },
    });
    await db.notification.deleteMany({
      where: { user_id: targetUserId },
    });
    await db.adminPermission.deleteMany({
      where: { user_id: targetUserId },
    });
    await db.pendingReminder.deleteMany({
      where: { target_user_id: targetUserId },
    });

    // Delete the user record last
    await db.user.delete({ where: { id: targetUserId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_COMPLIANCE_PURGE]", error);
    return NextResponse.json(
      { error: "Failed to purge user" },
      { status: 500 }
    );
  }
}
