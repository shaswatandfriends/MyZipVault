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

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shiftRequests = await db.shiftRequest.findMany({
      where: { recruiter_user_id: userId },
      include: {
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            candidate_profile: {
              select: {
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ shiftRequests });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_SHIFT_REQUESTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch shift requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      candidateUserId,
      shiftDate,
      startTime,
      endTime,
      position,
      facilityName,
      notes,
      responseDeadline,
    } = body;

    if (!candidateUserId || !shiftDate) {
      return NextResponse.json(
        { error: "candidateUserId and shiftDate are required" },
        { status: 400 }
      );
    }

    // Verify candidate exists
    const candidate = await db.user.findFirst({
      where: {
        id: Number(candidateUserId),
        role: "candidate",
        account_status: "active",
      },
      include: {
        candidate_profile: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const shiftRequest = await db.shiftRequest.create({
      data: {
        recruiter_user_id: userId,
        candidate_user_id: Number(candidateUserId),
        shift_date: new Date(shiftDate),
        start_time: startTime || null,
        end_time: endTime || null,
        position: position || null,
        facility_name: facilityName || null,
        notes: notes || null,
        response_deadline: responseDeadline ? new Date(responseDeadline) : null,
        status: "pending",
      },
      include: {
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            candidate_profile: {
              select: {
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Create notification for the candidate about the shift request
    const candidateName = candidate.candidate_profile?.first_name || candidate.first_name || "Candidate";
    const facilityLabel = facilityName ? ` at ${facilityName}` : "";
    const positionLabel = position ? ` for ${position}` : "";

    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId: Number(candidateUserId),
      category: "calendar",
      priority: "important",
      title: "New shift request",
      message: `New shift request${positionLabel}${facilityLabel} on ${new Date(shiftDate).toLocaleDateString()}${responseDeadline ? ` — please respond by ${new Date(responseDeadline).toLocaleDateString()}` : ""}`,
      relatedEntityId: shiftRequest.id,
      relatedEntityType: "shift_request",
    });

    return NextResponse.json({ shiftRequest }, { status: 201 });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_SHIFT_REQUESTS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create shift request" },
      { status: 500 }
    );
  }
}
