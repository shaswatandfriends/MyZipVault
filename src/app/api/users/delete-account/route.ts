import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

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
