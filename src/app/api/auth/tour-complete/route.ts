import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/auth/tour-complete
 *
 * Marks the current user as having completed the onboarding tour.
 * Sets User.onboarding_tour_completed_at = now().
 *
 * Called from <TourHost /> on either tour completion or skip.
 * Idempotent — re-running just updates the timestamp.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);

    await db.user.update({
      where: { id: userId },
      data: { onboarding_tour_completed_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[TOUR_COMPLETE]", error);
    return NextResponse.json({ error: "Failed to mark tour complete" }, { status: 500 });
  }
}
