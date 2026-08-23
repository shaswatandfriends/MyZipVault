import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST: Share availability with a candidate
export async function POST(request: Request) {
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

    const body = await request.json();
    const { shared_with_user_id } = body;

    if (!shared_with_user_id) {
      return NextResponse.json({ error: "Missing required field: shared_with_user_id" }, { status: 400 });
    }

    // Verify the target user exists and is a candidate
    const targetUser = await db.user.findUnique({
      where: { id: Number(shared_with_user_id) },
    });

    if (!targetUser || targetUser.role !== "candidate") {
      return NextResponse.json({ error: "Target user not found or is not a candidate" }, { status: 404 });
    }

    // Check if already shared
    const existingShare = await db.recruiterAvailabilityShare.findFirst({
      where: {
        recruiter_user_id: userId,
        shared_with_user_id: Number(shared_with_user_id),
        is_active: true,
      },
    });

    if (existingShare) {
      return NextResponse.json({ error: "Availability already shared with this candidate" }, { status: 400 });
    }

    const share = await db.recruiterAvailabilityShare.create({
      data: {
        recruiter_user_id: userId,
        shared_with_user_id: Number(shared_with_user_id),
      },
    });

    // Send notification to candidate
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId: Number(shared_with_user_id),
      category: "calendar",
      priority: "info",
      title: "Recruiter shared availability",
      message: `A recruiter has shared their availability with you.`,
      relatedEntityId: share.id,
      relatedEntityType: "recruiter_availability_share",
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_RECRUITER_AVAILABILITY_SHARE_POST]", error);
    return NextResponse.json({ error: "Failed to share availability" }, { status: 500 });
  }
}

// GET: Get all people recruiter shared availability with
export async function GET() {
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

    const shares = await db.recruiterAvailabilityShare.findMany({
      where: { recruiter_user_id: userId, is_active: true },
      include: {
        shared_with_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error("[CALENDAR_RECRUITER_AVAILABILITY_SHARE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch shares" }, { status: 500 });
  }
}
