import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Get distinct client_user_ids from checklist_requests for this candidate
    const checklistRequests = await db.checklistRequest.findMany({
      where: { candidate_user_id: userId },
      select: { client_user_id: true },
      distinct: ["client_user_id"],
    });

    const clientUserIds = checklistRequests.map((cr) => cr.client_user_id);

    if (clientUserIds.length === 0) {
      return NextResponse.json({ recruiters: [] });
    }

    // Fetch the recruiter users with their organization info
    const recruiters = await db.user.findMany({
      where: {
        id: { in: clientUserIds },
        role: { in: ["client_admin", "client_recruiter"] },
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ recruiters });
  } catch (error) {
    console.error("[CANDIDATE_RECRUITERS]", error);
    return NextResponse.json(
      { error: "Failed to fetch recruiters" },
      { status: 500 }
    );
  }
}
