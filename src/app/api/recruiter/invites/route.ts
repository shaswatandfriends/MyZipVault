import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/invites
 *
 * Lists all invites sent by the logged-in recruiter.
 * Ordered by sent_at DESC. Includes candidate name + job title for display.
 *
 * Status filter: ?status=sent|accepted|denied|expired (optional)
 *
 * Used by /recruiter/messages page to list chat conversations
 * (invites that have been accepted by the candidate).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const invites = await db.recruiterInvite.findMany({
      where: {
        recruiter_user_id: userId,
        ...(status ? { status } : {}),
      },
      orderBy: { sent_at: "desc" },
      include: {
        candidate: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
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
    console.error("[RECRUITER_INVITES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
}
