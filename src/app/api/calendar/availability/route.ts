import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get authenticated candidate's availability + settings
export async function GET() {
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

    const [availabilities, settings] = await Promise.all([
      db.candidateAvailability.findMany({
        where: { candidate_user_id: userId },
        orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
      }),
      db.candidateCalendarSetting.findUnique({
        where: { user_id: userId },
      }),
    ]);

    return NextResponse.json({ availabilities, settings });
  } catch (error) {
    console.error("[CALENDAR_AVAILABILITY_GET]", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}

// POST: Add availability slot
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
    const {
      availability_type,
      date,
      day_of_week,
      start_time,
      end_time,
      availability_status,
      notes,
    } = body;

    if (!availability_type || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: availability_type, start_time, end_time" },
        { status: 400 }
      );
    }

    const validTypes = ["specific_date", "recurring"];
    if (!validTypes.includes(availability_type)) {
      return NextResponse.json({ error: "Invalid availability_type. Must be: specific_date, recurring" }, { status: 400 });
    }

    if (availability_type === "specific_date" && !date) {
      return NextResponse.json({ error: "date is required for specific_date type" }, { status: 400 });
    }
    if (availability_type === "recurring" && day_of_week === undefined) {
      return NextResponse.json({ error: "day_of_week is required for recurring type" }, { status: 400 });
    }

    const slot = await db.candidateAvailability.create({
      data: {
        candidate_user_id: userId,
        availability_type,
        date: date ? new Date(date) : null,
        day_of_week: day_of_week !== undefined ? Number(day_of_week) : null,
        start_time,
        end_time,
        availability_status: availability_status || "free",
        notes: notes || null,
      },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_AVAILABILITY_POST]", error);
    return NextResponse.json({ error: "Failed to add availability slot" }, { status: 500 });
  }
}

// PUT: Update availability slot (uses query param id)
export async function PUT(request: Request) {
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
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: "Slot id is required" }, { status: 400 });
    }

    // Verify slot belongs to this candidate
    const existingSlot = await db.candidateAvailability.findUnique({
      where: { id: Number(id) },
    });

    if (!existingSlot || existingSlot.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const allowedFields = [
      "availability_type", "date", "day_of_week", "start_time",
      "end_time", "availability_status", "notes",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        if (field === "date") {
          updateData[field] = new Date(updateFields[field]);
        } else if (field === "day_of_week") {
          updateData[field] = Number(updateFields[field]);
        } else {
          updateData[field] = updateFields[field];
        }
      }
    }

    const updatedSlot = await db.candidateAvailability.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({ slot: updatedSlot });
  } catch (error) {
    console.error("[CALENDAR_AVAILABILITY_PUT]", error);
    return NextResponse.json({ error: "Failed to update availability slot" }, { status: 500 });
  }
}

// DELETE: Delete availability slot (uses query param id)
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get("id");

    if (!slotId) {
      return NextResponse.json({ error: "Slot id is required" }, { status: 400 });
    }

    // Verify slot belongs to this candidate
    const existingSlot = await db.candidateAvailability.findUnique({
      where: { id: Number(slotId) },
    });

    if (!existingSlot || existingSlot.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    await db.candidateAvailability.delete({
      where: { id: Number(slotId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALENDAR_AVAILABILITY_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete availability slot" }, { status: 500 });
  }
}
