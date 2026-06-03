import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAccountSuspensionEmail } from "@/lib/email";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    // Verify candidate role
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Only candidates can delete their account" }, { status: 403 });
    }

    const now = new Date();
    const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Set user account_status to suspended_deleting
    await db.user.update({
      where: { id: userId },
      data: {
        account_status: "suspended_deleting",
        deletion_requested_at: now,
      },
    });

    // Soft-delete all consent_shares where candidate_user_id matches
    await db.consentShare.updateMany({
      where: { candidate_user_id: userId },
      data: { is_deleted: true },
    });

    // Send account_suspension_confirmation email
    await sendAccountSuspensionEmail(
      session.user.email!,
      deletionDate.toLocaleDateString()
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ACCOUNT_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
