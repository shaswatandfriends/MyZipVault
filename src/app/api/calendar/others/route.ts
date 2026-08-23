import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get all calendars shared with authenticated user. Returns availability for each person who shared.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);

    // Find all active shares where this user is the recipient
    const shares = await db.calendarShare.findMany({
      where: {
        shared_with_user_id: userId,
        is_revoked: false,
      },
      include: {
        owner_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Filter out expired shares
    const now = new Date();
    const activeShares = shares.filter((s) => !s.expires_at || s.expires_at > now);

    // For each share, get the owner's availability
    const results = await Promise.all(
      activeShares.map(async (share) => {
        const availabilities = await db.candidateAvailability.findMany({
          where: { candidate_user_id: share.owner_user_id },
          select: {
            id: true,
            availability_type: true,
            date: true,
            day_of_week: true,
            start_time: true,
            end_time: true,
            availability_status: true,
            notes: true,
          },
          orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
        });

        const settings = await db.candidateCalendarSetting.findUnique({
          where: { user_id: share.owner_user_id },
          select: {
            availability_status: true,
            shift_duration_preference: true,
            minimum_notice_hours: true,
          },
        });

        return {
          shareId: share.id,
          shareType: share.share_type,
          sharedAt: share.created_at,
          expiresAt: share.expires_at,
          owner: share.owner_user,
          availabilities,
          settings,
        };
      })
    );

    return NextResponse.json({ sharedCalendars: results });
  } catch (error) {
    console.error("[CALENDAR_OTHERS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch shared calendars" }, { status: 500 });
  }
}
