import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/messages/[inviteId]
 *
 * Fetches chat messages for a specific RecruiterInvite.
 * Either party (candidate or recruiter) can read — must be a participant.
 *
 * Optional query: ?markRead=true — marks all messages from the OTHER party
 * as read by the current user. Used when chat window is opened.
 *
 * Returns messages ordered oldest → newest for natural chat display.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;

    const { inviteId: inviteIdStr } = await params;
    const inviteId = parseInt(inviteIdStr, 10);
    if (isNaN(inviteId)) {
      return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });
    }

    // Verify the invite exists and the current user is a participant
    const invite = await db.recruiterInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        recruiter_user_id: true,
        candidate_user_id: true,
        status: true,
      },
    });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Authorization: must be either the recruiter or the candidate
    const isRecruiter = invite.recruiter_user_id === userId;
    const isCandidate =
      invite.candidate_user_id === userId || role === "candidate";
    if (!isRecruiter && !isCandidate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // If candidate: ensure they actually own THIS invite
    if (role === "candidate" && !isRecruiter) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const inviteFull = await db.recruiterInvite.findUnique({
        where: { id: inviteId },
        select: { candidate_email: true, candidate_user_id: true },
      });
      const ownsInvite =
        inviteFull?.candidate_user_id === userId ||
        (user && inviteFull?.candidate_email?.toLowerCase() === user.email.toLowerCase());
      if (!ownsInvite) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const markRead = searchParams.get("markRead") === "true";

    // Fetch messages oldest → newest
    const messages = await db.message.findMany({
      where: { invite_id: inviteId },
      orderBy: { sent_at: "asc" },
      include: {
        sender: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
      },
    });

    // Mark all messages from the OTHER party as read
    if (markRead) {
      await db.message.updateMany({
        where: {
          invite_id: inviteId,
          sender_user_id: { not: userId },
          read_at: null,
        },
        data: { read_at: new Date() },
      });
    }

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("[MESSAGES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

/**
 * POST /api/messages/[inviteId]
 *
 * Sends a new message in an accepted invite's chat.
 * Body: { body: string }
 *
 * Auth: must be either the recruiter or candidate of THIS invite.
 * Invite must be in 'accepted' status (no chat before acceptance).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;

    const { inviteId: inviteIdStr } = await params;
    const inviteId = parseInt(inviteIdStr, 10);
    if (isNaN(inviteId)) {
      return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });
    }

    const body = await request.json();
    const { body: messageBody } = body;
    if (!messageBody || typeof messageBody !== "string" || !messageBody.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    if (messageBody.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
    }

    // Verify invite exists + is accepted + user is a participant
    const invite = await db.recruiterInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, recruiter_user_id: true, candidate_user_id: true, status: true, candidate_email: true },
    });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.status !== "accepted") {
      return NextResponse.json({ error: "Chat only opens after invite is accepted" }, { status: 400 });
    }

    // Authorization
    let isParticipant = invite.recruiter_user_id === userId;
    if (!isParticipant && role === "candidate") {
      // For candidate, also check by email match if candidate_user_id isn't yet set
      if (invite.candidate_user_id === userId) {
        isParticipant = true;
      } else {
        const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (user && invite.candidate_email?.toLowerCase() === user.email.toLowerCase()) {
          isParticipant = true;
        }
      }
    }
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create the message
    const message = await db.message.create({
      data: {
        invite_id: inviteId,
        sender_user_id: userId,
        body: messageBody.trim(),
      },
      include: {
        sender: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("[MESSAGES_POST]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
