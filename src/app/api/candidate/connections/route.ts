import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/candidate/connections
 *
 * Lists all recruiter invites for the logged-in candidate.
 * Ordered by sent_at DESC. Includes recruiter name + job title for display.
 *
 * Status filter: ?status=sent|accepted|denied|expired (optional)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Look up invites where candidate_email matches the user's email OR
    // candidate_user_id is set to this user.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const invites = await db.recruiterInvite.findMany({
      where: {
        OR: [
          { candidate_user_id: userId },
          { candidate_email: { equals: user.email, mode: "insensitive" } },
        ],
        ...(status ? { status } : {}),
      },
      orderBy: { sent_at: "desc" },
      include: {
        recruiter: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            organization_id: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            profession: true,
            specialty: true,
            city: true,
            state: true,
            is_remote: true,
            salary_display: true,
          },
        },
      },
    });

    return NextResponse.json({ invites });
  } catch (error: any) {
    console.error("[CONNECTIONS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}
