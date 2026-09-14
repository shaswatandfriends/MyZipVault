import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/messages/unread-count
 *
 * Returns the count of unread messages for the current user.
 * Used by the sidebar "Messages" shortcut badge.
 *
 * For candidate: counts messages in accepted invites where sender_user_id != me
 * For recruiter: same — counts messages in accepted invites sent BY candidates
 *
 * Response: { unread_count: number }
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);

    // Count unread messages addressed to this user (sender is NOT me,
    // invite is accepted so chat is open)
    const count = await db.message.count({
      where: {
        sender_user_id: { not: userId },
        read_at: null,
        invite: {
          status: "accepted",
          OR: [
            { recruiter_user_id: userId },
            { candidate_user_id: userId },
          ],
        },
      },
    });

    return NextResponse.json({ unread_count: count });
  } catch (error: any) {
    console.error("[UNREAD_COUNT]", error);
    return NextResponse.json({ error: "Failed to fetch unread count" }, { status: 500 });
  }
}
