import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAccountSuspensionEmail } from "@/lib/email";
import { logAccountSuspended } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Fetch user email and phone for notification
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    // Soft-delete: set account status to suspended_deleting
    await db.user.update({
      where: { id: userId },
      data: {
        account_status: "suspended_deleting",
        deletion_requested_at: new Date(),
      },
    });

    // Soft-delete all consent shares
    await db.consentShare.updateMany({
      where: { candidate_user_id: userId },
      data: { is_deleted: true },
    });

    // Send account suspension confirmation email
    if (user?.email) {
      const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const deletionDateStr = deletionDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await sendAccountSuspensionEmail(user.email, deletionDateStr, user.phone ?? undefined);
    }

    // Audit log
    await logAccountSuspended(userId, userId);

    return NextResponse.json({
      message:
        "Account scheduled for deletion. You have 30 days to restore your account by contacting support.",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
