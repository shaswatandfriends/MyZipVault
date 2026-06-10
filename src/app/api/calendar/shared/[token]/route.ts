import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Public endpoint (requires auth). Validate token, not revoked, not expired. Return candidate's calendar availability only.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    // Find the share by token
    const share = await db.calendarShare.findUnique({
      where: { share_token: token },
    });

    if (!share) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
    }

    // Check if revoked
    if (share.is_revoked) {
      return NextResponse.json({ error: "This share link has been revoked" }, { status: 410 });
    }

    // Check if expired
    if (share.expires_at && new Date() > share.expires_at) {
      return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
    }

    // Get the candidate's availability — never return contact info or profile data
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

    // Get the candidate's calendar settings (limited info)
    const settings = await db.candidateCalendarSetting.findUnique({
      where: { user_id: share.owner_user_id },
      select: {
        availability_status: true,
        shift_duration_preference: true,
        minimum_notice_hours: true,
        quick_override_active: true,
      },
    });

    return NextResponse.json({
      availabilities,
      settings,
    });
  } catch (error) {
    console.error("[CALENDAR_SHARED_TOKEN_GET]", error);
    return NextResponse.json({ error: "Failed to fetch shared calendar" }, { status: 500 });
  }
}
