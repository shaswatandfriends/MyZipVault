import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

// POST: Share calendar directly with a user
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
    const { shared_with_user_id, expiry_type } = body;

    if (!shared_with_user_id || !expiry_type) {
      return NextResponse.json(
        { error: "Missing required fields: shared_with_user_id, expiry_type" },
        { status: 400 }
      );
    }

    const validExpiryTypes = ["one_day", "one_month", "one_year", "never"];
    if (!validExpiryTypes.includes(expiry_type)) {
      return NextResponse.json(
        { error: "Invalid expiry_type. Must be: one_day, one_month, one_year, never" },
        { status: 400 }
      );
    }

    // Verify the recipient user exists
    const recipient = await db.user.findUnique({
      where: { id: Number(shared_with_user_id) },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
    }

    const expiresAt = calculateExpiry(expiry_type);

    const share = await db.calendarShare.create({
      data: {
        owner_user_id: userId,
        shared_with_user_id: Number(shared_with_user_id),
        share_type: "direct",
        expiry_type,
        expires_at: expiresAt,
      },
    });

    // Send notification to recipient
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId: Number(shared_with_user_id),
      category: "calendar",
      priority: "info",
      title: "Calendar shared with you",
      message: `A candidate has shared their calendar availability with you.`,
      relatedEntityId: share.id,
      relatedEntityType: "calendar_share",
      metadata: { share_id: share.id, owner_user_id: userId },
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_SHARE_DIRECT_POST]", error);
    return NextResponse.json({ error: "Failed to share calendar" }, { status: 500 });
  }
}
