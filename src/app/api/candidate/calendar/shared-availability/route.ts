import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── GET: Return recruiter availability for calendars shared with the candidate
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find all active (non-revoked, non-expired) calendar shares where this
    // candidate is the owner.  Both direct and link-based shares grant access
    // to the recruiter's availability.
    const shares = await db.calendarShare.findMany({
      where: {
        candidate_user_id: userId,
        is_revoked: false,
        // Only include shares that haven't expired (or have no expiry)
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } },
        ],
      },
      select: {
        id: true,
        share_type: true,
        recruiter_user_id: true,
      },
    });

    // Collect unique recruiter user IDs from direct shares
    const recruiterUserIds = shares
      .map((s) => s.recruiter_user_id)
      .filter((id): id is number => id !== null);

    if (recruiterUserIds.length === 0) {
      return NextResponse.json({ availability: [] });
    }

    // Fetch recruiter availability for those recruiters
    const availability = await db.recruiterAvailability.findMany({
      where: {
        recruiter_user_id: { in: recruiterUserIds },
      },
      include: {
        recruiter_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("[CANDIDATE_SHARED_AVAILABILITY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch shared availability" },
      { status: 500 }
    );
  }
}
