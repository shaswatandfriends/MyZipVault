import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/candidate/connections/[id]/deny
 *
 * Candidate denies an invite. Sets status=denied, denied_at=now.
 * The recruiter's data + job are still captured for the candidate's
 * future reference (the invite row is preserved, not deleted).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const inviteId = parseInt(id, 10);
    if (isNaN(inviteId)) {
      return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const invite = await db.recruiterInvite.findFirst({
      where: {
        id: inviteId,
        OR: [
          { candidate_user_id: userId },
          { candidate_email: { equals: user.email, mode: "insensitive" } },
        ],
      },
    });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.status === "accepted") {
      return NextResponse.json({ error: "Invite already accepted — cannot deny" }, { status: 400 });
    }
    if (invite.status === "denied") {
      return NextResponse.json({ error: "Invite already denied" }, { status: 400 });
    }

    await db.recruiterInvite.update({
      where: { id: inviteId },
      data: {
        status: "denied",
        denied_at: new Date(),
        candidate_user_id: userId,
      },
    });

    return NextResponse.json({ success: true, status: "denied" });
  } catch (error: any) {
    console.error("[CONNECTIONS_DENY]", error);
    return NextResponse.json({ error: "Failed to deny invite" }, { status: 500 });
  }
}
