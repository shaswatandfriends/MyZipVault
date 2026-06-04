import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAccountRestored } from "@/lib/audit";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Verify user has suspended_deleting status
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.account_status !== "suspended_deleting") {
      return NextResponse.json(
        { error: "Account is not in deletion pending state" },
        { status: 400 }
      );
    }

    // Set user account_status back to active
    await db.user.update({
      where: { id: userId },
      data: {
        account_status: "active",
        deletion_requested_at: null,
      },
    });

    // Restore consent_shares where candidate_user_id matches and expires_at is still in future
    const now = new Date();
    await db.consentShare.updateMany({
      where: {
        candidate_user_id: userId,
        expires_at: { gt: now },
        is_deleted: true,
      },
      data: { is_deleted: false },
    });

    // Audit log
    await logAccountRestored(userId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ACCOUNT_RESTORE]", error);
    return NextResponse.json(
      { error: "Failed to restore account" },
      { status: 500 }
    );
  }
}
