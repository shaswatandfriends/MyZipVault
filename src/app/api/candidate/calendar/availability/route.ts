import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── GET: Return all CalendarAvailability for the authenticated candidate ────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const slots = await db.calendarAvailability.findMany({
      where: { candidate_user_id: userId },
      orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
    });

    // Extract metadata from the latest record
    let availabilityStatus = "actively_looking";
    let minNoticeHours = 24;
    let shiftDurationPref: string | null = null;

    if (slots.length > 0) {
      const latest = slots[slots.length - 1];
      availabilityStatus = latest.availability_status;
      minNoticeHours = latest.min_notice_hours;
      shiftDurationPref = latest.shift_duration_pref;
    }

    return NextResponse.json({
      slots,
      availabilityStatus,
      minNoticeHours,
      shiftDurationPref,
    });
  } catch (error) {
    console.error("[CANDIDATE_AVAILABILITY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

// ─── POST: Create or update availability slots (bulk) ────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      slots,
      templateName,
      availabilityStatus,
      minNoticeHours,
      shiftDurationPref,
    } = body as {
      slots: Array<{
        dayOfWeek: number | null;
        specificDate: string | null;
        startTime: string | null;
        endTime: string | null;
        isAvailable: boolean;
        isRecurring: boolean;
        label: string | null;
      }>;
      templateName?: string;
      availabilityStatus?: string;
      minNoticeHours?: number;
      shiftDurationPref?: string;
    };

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: "Slots array is required and must not be empty" },
        { status: 400 }
      );
    }

    // If templateName provided, delete all existing slots with that template
    if (templateName) {
      await db.calendarAvailability.deleteMany({
        where: {
          candidate_user_id: userId,
          template_name: templateName,
        },
      });
    }

    // Determine the metadata values to apply
    const currentLatest = await db.calendarAvailability.findFirst({
      where: { candidate_user_id: userId },
      orderBy: { id: "desc" },
    });

    const statusValue = availabilityStatus ?? currentLatest?.availability_status ?? "actively_looking";
    const noticeValue = minNoticeHours ?? currentLatest?.min_notice_hours ?? 24;
    const durationValue = shiftDurationPref ?? currentLatest?.shift_duration_pref ?? null;

    // Create all new slots
    const created = await db.$transaction(
      slots.map((slot) =>
        db.calendarAvailability.create({
          data: {
            candidate_user_id: userId,
            day_of_week: slot.dayOfWeek,
            specific_date: slot.specificDate ? new Date(slot.specificDate) : null,
            start_time: slot.startTime,
            end_time: slot.endTime,
            is_available: slot.isAvailable,
            is_recurring: slot.isRecurring,
            label: slot.label,
            template_name: templateName ?? null,
            availability_status: statusValue,
            min_notice_hours: noticeValue,
            shift_duration_pref: durationValue,
          },
        })
      )
    );

    // Update all existing records with the new metadata values
    await db.calendarAvailability.updateMany({
      where: { candidate_user_id: userId },
      data: {
        availability_status: statusValue,
        min_notice_hours: noticeValue,
        shift_duration_pref: durationValue,
      },
    });

    return NextResponse.json({ slots: created, count: created.length });
  } catch (error) {
    console.error("[CANDIDATE_AVAILABILITY_POST]", error);
    return NextResponse.json(
      { error: "Failed to create availability slots" },
      { status: 500 }
    );
  }
}

// ─── PUT: Update a single availability slot ──────────────────────────────────
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, dayOfWeek, startTime, endTime, isAvailable, label } = body as {
      id: number;
      dayOfWeek?: number | null;
      startTime?: string | null;
      endTime?: string | null;
      isAvailable?: boolean;
      label?: string | null;
    };

    if (!id) {
      return NextResponse.json(
        { error: "Slot ID is required" },
        { status: 400 }
      );
    }

    // Verify the slot belongs to this candidate
    const existing = await db.calendarAvailability.findFirst({
      where: { id, candidate_user_id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dayOfWeek !== undefined) updateData.day_of_week = dayOfWeek;
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime;
    if (isAvailable !== undefined) updateData.is_available = isAvailable;
    if (label !== undefined) updateData.label = label;

    const updated = await db.calendarAvailability.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ slot: updated });
  } catch (error) {
    console.error("[CANDIDATE_AVAILABILITY_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update availability slot" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a single availability slot ───────────────────────────────
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body as { id: number };

    if (!id) {
      return NextResponse.json(
        { error: "Slot ID is required" },
        { status: 400 }
      );
    }

    // Verify the slot belongs to this candidate
    const existing = await db.calendarAvailability.findFirst({
      where: { id, candidate_user_id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    await db.calendarAvailability.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Slot deleted successfully" });
  } catch (error) {
    console.error("[CANDIDATE_AVAILABILITY_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete availability slot" },
      { status: 500 }
    );
  }
}
