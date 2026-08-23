import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

// ─── Helper: Calculate expires_at from expiryType ────────────────────────────
function calculateExpiresAt(expiryType: string): Date | null {
  const now = new Date();
  switch (expiryType) {
    case "1_day": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d;
    }
    case "1_month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    case "1_year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    case "never":
      return null;
    default: {
      // Default to 30 days
      const d = new Date(now);
      d.setDate(d.getDate() + 30);
      return d;
    }
  }
}

// ─── GET: Return all CalendarShare records for the candidate ─────────────────
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

    const shares = await db.calendarShare.findMany({
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

    return NextResponse.json({ shares });
  } catch (error) {
    console.error("[CANDIDATE_CALENDAR_SHARES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar shares" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new calendar share ───────────────────────────────────────
export async function POST(request: Request) {
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
    const { shareType, recruiterUserId, expiryType } = body as {
      shareType: "direct" | "link";
      recruiterUserId?: number;
      expiryType: "1_day" | "1_month" | "1_year" | "never";
    };

    if (!shareType || !expiryType) {
      return NextResponse.json(
        { error: "shareType and expiryType are required" },
        { status: 400 }
      );
    }

    if (shareType !== "direct" && shareType !== "link") {
      return NextResponse.json(
        { error: "shareType must be 'direct' or 'link'" },
        { status: 400 }
      );
    }

    if (shareType === "direct" && !recruiterUserId) {
      return NextResponse.json(
        { error: "recruiterUserId is required for direct shares" },
        { status: 400 }
      );
    }

    const expiresAt = calculateExpiresAt(expiryType);

    const shareData: Record<string, unknown> = {
      candidate_user_id: userId,
      share_type: shareType,
      expiry_type: expiryType,
      expires_at: expiresAt,
    };

    if (shareType === "direct") {
      shareData.recruiter_user_id = recruiterUserId;
    } else {
      // Generate a unique share token for link-based sharing
      shareData.share_token = crypto.randomBytes(16).toString("hex");
    }

    const share = await db.calendarShare.create({
      data: shareData as Parameters<typeof db.calendarShare.create>[0]["data"],
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

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error("[CANDIDATE_CALENDAR_SHARES_POST]", error);
    return NextResponse.json(
      { error: "Failed to create calendar share" },
      { status: 500 }
    );
  }
}

// ─── PUT: Revoke a calendar share ────────────────────────────────────────────
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
    const { shareId } = body as { shareId: number };

    if (!shareId) {
      return NextResponse.json(
        { error: "shareId is required" },
        { status: 400 }
      );
    }

    // Verify the share belongs to this candidate
    const existing = await db.calendarShare.findFirst({
      where: { id: shareId, candidate_user_id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Calendar share not found" },
        { status: 404 }
      );
    }

    if (existing.is_revoked) {
      return NextResponse.json(
        { error: "Share is already revoked" },
        { status: 400 }
      );
    }

    const updated = await db.calendarShare.update({
      where: { id: shareId },
      data: { is_revoked: true },
    });

    return NextResponse.json({ share: updated });
  } catch (error) {
    console.error("[CANDIDATE_CALENDAR_SHARES_PUT]", error);
    return NextResponse.json(
      { error: "Failed to revoke calendar share" },
      { status: 500 }
    );
  }
}
