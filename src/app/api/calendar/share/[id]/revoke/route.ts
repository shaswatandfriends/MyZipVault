import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE: Revoke a share
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { id } = await params;
    const shareId = Number(id);

    const share = await db.calendarShare.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Only the owner can revoke
    if (share.owner_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.calendarShare.update({
      where: { id: shareId },
      data: { is_revoked: true },
    });

    // Send notification to recipient if it was a direct share
    if (share.shared_with_user_id) {
      await db.notification.create({
        data: {
          user_id: share.shared_with_user_id,
          message: `A calendar share has been revoked by the owner.`,
          type: "calendar_share_revoked",
          related_entity_id: shareId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALENDAR_SHARE_REVOKE]", error);
    return NextResponse.json({ error: "Failed to revoke share" }, { status: 500 });
  }
}
