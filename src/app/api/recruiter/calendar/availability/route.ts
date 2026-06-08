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

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const slots = await db.recruiterAvailability.findMany({
      where: { recruiter_user_id: userId },
      orderBy: [
        { day_of_week: "asc" },
        { specific_date: "asc" },
        { start_time: "asc" },
      ],
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_AVAILABILITY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
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

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { slots } = body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: "slots array is required and must not be empty" },
        { status: 400 }
      );
    }

    const createdSlots = [];

    for (const slot of slots) {
      const {
        dayOfWeek,
        specificDate,
        startTime,
        endTime,
        isAvailable,
        isRecurring,
        label,
      } = slot;

      const data = {
        recruiter_user_id: userId,
        day_of_week: dayOfWeek !== undefined ? Number(dayOfWeek) : null,
        specific_date: specificDate ? new Date(specificDate) : null,
        start_time: startTime || null,
        end_time: endTime || null,
        is_available: isAvailable !== undefined ? Boolean(isAvailable) : true,
        is_recurring: isRecurring !== undefined ? Boolean(isRecurring) : false,
        label: label || null,
      };

      const created = await db.recruiterAvailability.create({ data });
      createdSlots.push(created);
    }

    return NextResponse.json({ slots: createdSlots }, { status: 201 });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_AVAILABILITY_POST]", error);
    return NextResponse.json(
      { error: "Failed to create availability slots" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Slot id is required" },
        { status: 400 }
      );
    }

    // Verify slot belongs to this recruiter
    const slot = await db.recruiterAvailability.findFirst({
      where: { id: Number(id), recruiter_user_id: userId },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    await db.recruiterAvailability.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_AVAILABILITY_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete availability slot" },
      { status: 500 }
    );
  }
}
