import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/recruiter/[publicId]/book
 *
 * Book a call with a recruiter. Auth required (candidate must be logged in).
 *
 * Body: {
 *   scheduled_at: string (ISO datetime),
 *   notes?: string,
 * }
 *
 * Rules:
 *   - Only Sat/Sun slots are allowed
 *   - Slot must be at least 24 hours in the future
 *   - No double-booking (same recruiter + same time)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Please log in to book a call" }, { status: 401 });
    }

    const candidateId = Number((session.user as Record<string, unknown>).id);
    const candidateRole = (session.user as Record<string, unknown>).role as string;
    if (candidateRole !== "candidate") {
      return NextResponse.json({ error: "Only candidates can book calls" }, { status: 403 });
    }

    const { publicId } = await params;
    const body = await request.json();
    const { scheduled_at, notes } = body;

    if (!scheduled_at) {
      return NextResponse.json({ error: "scheduled_at is required" }, { status: 400 });
    }

    const scheduledAt = new Date(scheduled_at);
    const now = new Date();

    // Validate: must be at least 24 hours in the future
    const minTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (scheduledAt < minTime) {
      return NextResponse.json(
        { error: "Booking must be at least 24 hours in advance" },
        { status: 400 },
      );
    }

    // Validate: only Sat (6) or Sun (0)
    const dayOfWeek = scheduledAt.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      return NextResponse.json(
        { error: "Bookings are only available on Saturdays and Sundays" },
        { status: 400 },
      );
    }

    // Find the recruiter
    const recruiter = await db.user.findFirst({
      where: {
        public_id: publicId,
        role: { in: ["client_recruiter", "client_admin"] },
        account_status: "active",
      },
      select: { id: true, first_name: true, last_name: true, email: true },
    });

    if (!recruiter) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    // Check for double-booking (same recruiter, same 30-min window)
    const existingBooking = await db.recruiterBooking.findFirst({
      where: {
        recruiter_user_id: recruiter.id,
        status: { in: ["pending", "confirmed"] },
        scheduled_at: {
          gte: new Date(scheduledAt.getTime() - 30 * 60 * 1000),
          lte: new Date(scheduledAt.getTime() + 30 * 60 * 1000),
        },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "This time slot is already booked. Please pick another time." },
        { status: 409 },
      );
    }

    // Get candidate info
    const candidate = await db.user.findUnique({
      where: { id: candidateId },
      select: { email: true, first_name: true, last_name: true },
    });

    // Create the booking
    const booking = await db.recruiterBooking.create({
      data: {
        recruiter_user_id: recruiter.id,
        candidate_user_id: candidateId,
        candidate_name: [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ") || "Candidate",
        candidate_email: candidate?.email || "",
        scheduled_at: scheduledAt,
        duration_minutes: 30,
        status: "pending",
        notes: notes || null,
      },
    });

    // Notify the recruiter
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: recruiter.id,
        category: "calendar",
        priority: "important",
        title: "New call booking",
        message: `${booking.candidate_name} booked a call with you on ${scheduledAt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`,
        actionUrl: "/recruiter/calendar",
        actionLabel: "View booking",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        scheduled_at: booking.scheduled_at,
        status: booking.status,
      },
    });
  } catch (error: any) {
    console.error("[RECRUITER_BOOKING]", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

/**
 * GET /api/recruiter/[publicId]/book
 *
 * Returns existing bookings for the recruiter (to show which slots
 * are already taken on the calendar).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    const recruiter = await db.user.findFirst({
      where: {
        public_id: publicId,
        role: { in: ["client_recruiter", "client_admin"] },
      },
      select: { id: true },
    });

    if (!recruiter) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    // Get upcoming bookings (next 60 days)
    const now = new Date();
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const bookings = await db.recruiterBooking.findMany({
      where: {
        recruiter_user_id: recruiter.id,
        status: { in: ["pending", "confirmed"] },
        scheduled_at: { gte: now, lte: sixtyDaysLater },
      },
      select: {
        id: true,
        scheduled_at: true,
        duration_minutes: true,
        status: true,
      },
      orderBy: { scheduled_at: "asc" },
    });

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        scheduled_at: b.scheduled_at,
        duration_minutes: b.duration_minutes,
        status: b.status,
      })),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[RECRUITER_BOOKING_GET]", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
