import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET: Public shared calendar endpoint (no auth required) ────────────────
// The share token serves as authentication. Anyone with the token can view
// the candidate's availability data.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid share token", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    // Find the CalendarShare by token
    const share = await db.calendarShare.findUnique({
      where: { share_token: token },
      include: {
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Share link not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if revoked
    if (share.is_revoked) {
      return NextResponse.json(
        { error: "This share link has been revoked", code: "REVOKED" },
        { status: 410 }
      );
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired", code: "EXPIRED" },
        { status: 410 }
      );
    }

    // Fetch the candidate's availability data
    const availability = await db.calendarAvailability.findMany({
      where: {
        candidate_user_id: share.candidate_user_id,
      },
      orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
    });

    // Derive overall preferences from availability records
    // Use the most recent record's preferences as the "global" defaults
    const latestRecord = availability.length > 0 ? availability[availability.length - 1] : null;

    // Collect unique availability statuses and preferences
    const availabilityStatuses = [
      ...new Set(availability.map((a) => a.availability_status)),
    ];
    const primaryStatus = availabilityStatuses.length > 0
      ? availabilityStatuses[0]
      : "actively_looking";

    const minNoticeHours = latestRecord?.min_notice_hours ?? 24;
    const shiftDurationPrefs = [
      ...new Set(
        availability
          .map((a) => a.shift_duration_pref)
          .filter((p): p is string => p !== null)
      ),
    ];

    // Build response
    const candidateName = [
      share.candidate_user.first_name,
      share.candidate_user.last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Candidate";

    const responseData = {
      candidate: {
        id: share.candidate_user.id,
        firstName: share.candidate_user.first_name,
        lastName: share.candidate_user.last_name,
        displayName: candidateName,
      },
      share: {
        id: share.id,
        shareType: share.share_type,
        expiryType: share.expiry_type,
        expiresAt: share.expires_at,
        createdAt: share.created_at,
      },
      availability: availability.map((a) => ({
        id: a.id,
        dayOfWeek: a.day_of_week,
        specificDate: a.specific_date?.toISOString() ?? null,
        startTime: a.start_time,
        endTime: a.end_time,
        isAvailable: a.is_available,
        isRecurring: a.is_recurring,
        label: a.label,
        templateName: a.template_name,
        minNoticeHours: a.min_notice_hours,
        shiftDurationPref: a.shift_duration_pref,
        availabilityStatus: a.availability_status,
      })),
      preferences: {
        availabilityStatus: primaryStatus,
        minNoticeHours,
        shiftDurationPrefs,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[SHARED_CALENDAR_GET]", error);
    return NextResponse.json(
      { error: "Failed to load shared calendar", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
