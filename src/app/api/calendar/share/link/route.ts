import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

function calculateExpiry(expiryType: string): Date | null {
  const now = new Date();
  switch (expiryType) {
    case "one_day": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d;
    }
    case "one_month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    case "one_year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    case "never":
      return null;
    default:
      return null;
  }
}

// POST: Generate shareable link
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden — candidate role required" }, { status: 403 });
    }

    const body = await request.json();
    const { expiry_type } = body;

    if (!expiry_type) {
      return NextResponse.json({ error: "Missing required field: expiry_type" }, { status: 400 });
    }

    const validExpiryTypes = ["one_day", "one_month", "one_year", "never"];
    if (!validExpiryTypes.includes(expiry_type)) {
      return NextResponse.json(
        { error: "Invalid expiry_type. Must be: one_day, one_month, one_year, never" },
        { status: 400 }
      );
    }

    const shareToken = uuidv4();
    const expiresAt = calculateExpiry(expiry_type);

    const share = await db.calendarShare.create({
      data: {
        owner_user_id: userId,
        share_type: "link",
        share_token: shareToken,
        expiry_type,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({
      shareUrl: `/calendar/shared/${shareToken}`,
      token: shareToken,
      expiresAt,
      shareId: share.id,
    }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_SHARE_LINK_POST]", error);
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}
