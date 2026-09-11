import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/placements/count
 *
 * Returns the count of successfully-placed candidates by this recruiter.
 * A "placement" is a CandidateSubmission with status='placed' (or
 * 'hired' depending on the stage taxonomy).
 *
 * Used by the sidebar "My Placements" shortcut badge.
 *
 * Response: { count: number }
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Count submissions by this recruiter with status in placement-stage set
    // (covers 'placed', 'hired', 'accepted', 'offer_accepted')
    const count = await db.candidateSubmission.count({
      where: {
        recruiter_user_id: userId,
        status: { in: ["placed", "hired", "accepted", "offer_accepted"] },
      },
    });

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("[PLACEMENTS_COUNT]", error);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
