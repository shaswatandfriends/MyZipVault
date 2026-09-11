import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/submittals/count
 *
 * Returns the count of candidate submissions made by this recruiter's org.
 * Used by the sidebar "My Submittals" shortcut badge.
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

    // Count submissions made by THIS recruiter (not org-wide — that would
    // require an org_id lookup; for now, count by recruiter_user_id)
    const count = await db.candidateSubmission.count({
      where: { recruiter_user_id: userId },
    });

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("[SUBMITTALS_COUNT]", error);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
