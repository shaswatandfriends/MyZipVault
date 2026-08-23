import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST: Recruiter sends shift request to candidate
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      candidate_user_id,
      facility_name,
      specialty,
      shift_type,
      start_date,
      end_date,
      start_time,
      end_time,
      notes,
    } = body;

    // Validate required fields
    if (!candidate_user_id || !facility_name || !specialty || !shift_type || !start_date || !end_date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: candidate_user_id, facility_name, specialty, shift_type, start_date, end_date, start_time, end_time" },
        { status: 400 }
      );
    }

    // Verify candidate exists
    const candidate = await db.user.findUnique({
      where: { id: Number(candidate_user_id), role: "candidate" },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Get candidate's response_deadline_hours from settings
    const candidateSettings = await db.candidateCalendarSetting.findUnique({
      where: { user_id: Number(candidate_user_id) },
    });

    const deadlineHours = candidateSettings?.response_deadline_hours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + deadlineHours);

    const shiftRequest = await db.shiftRequest.create({
      data: {
        recruiter_user_id: userId,
        candidate_user_id: Number(candidate_user_id),
        organization_id: organizationId,
        facility_name,
        specialty,
        shift_type,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        start_time,
        end_time,
        notes: notes || null,
        expires_at: expiresAt,
      },
    });

    // Send notification to candidate
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId: Number(candidate_user_id),
      category: "calendar",
      priority: "important",
      title: "New shift request",
      message: `You have a new shift request from ${facility_name}.`,
      relatedEntityId: shiftRequest.id,
      relatedEntityType: "shift_request",
      metadata: { shift_request_id: shiftRequest.id },
    });

    return NextResponse.json({ shiftRequest }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_SHIFTS_POST]", error);
    return NextResponse.json({ error: "Failed to create shift request" }, { status: 500 });
  }
}

// GET: For candidate: received requests. For recruiter: sent requests. Filter by status.
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (userRole === "candidate") {
      where.candidate_user_id = userId;
    } else if (["client_recruiter", "client_admin"].includes(userRole)) {
      where.recruiter_user_id = userId;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status) where.status = status;

    const [shiftRequests, total] = await Promise.all([
      db.shiftRequest.findMany({
        where,
        include: {
          recruiter_user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          candidate_user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      db.shiftRequest.count({ where }),
    ]);

    return NextResponse.json({
      shiftRequests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[CALENDAR_SHIFTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch shift requests" }, { status: 500 });
  }
}
