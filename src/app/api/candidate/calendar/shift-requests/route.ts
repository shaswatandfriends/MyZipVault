import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── GET: Return all ShiftRequests for the authenticated candidate ───────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shiftRequests = await db.shiftRequest.findMany({
      where: { candidate_user_id: userId },
      include: {
        recruiter_user: {
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
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ shiftRequests });
  } catch (error) {
    console.error("[CANDIDATE_SHIFT_REQUESTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch shift requests" },
      { status: 500 }
    );
  }
}

// ─── PUT: Respond to a shift request ─────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { shiftRequestId, status, responseNote } = body as {
      shiftRequestId: number;
      status: "accepted" | "declined";
      responseNote?: string;
    };

    if (!shiftRequestId || !status) {
      return NextResponse.json(
        { error: "shiftRequestId and status are required" },
        { status: 400 }
      );
    }

    if (status !== "accepted" && status !== "declined") {
      return NextResponse.json(
        { error: "Status must be 'accepted' or 'declined'" },
        { status: 400 }
      );
    }

    // Verify the shift request belongs to this candidate
    const existing = await db.shiftRequest.findFirst({
      where: { id: shiftRequestId, candidate_user_id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Shift request not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Shift request has already been responded to" },
        { status: 400 }
      );
    }

    const updated = await db.shiftRequest.update({
      where: { id: shiftRequestId },
      data: {
        status,
        responded_at: new Date(),
        response_note: responseNote ?? null,
      },
      include: {
        recruiter_user: {
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
        },
      },
    });

    return NextResponse.json({ shiftRequest: updated });
  } catch (error) {
    console.error("[CANDIDATE_SHIFT_REQUESTS_PUT]", error);
    return NextResponse.json(
      { error: "Failed to respond to shift request" },
      { status: 500 }
    );
  }
}
