import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { onInterviewScheduled } from "@/lib/bob/status-engine";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {
      recruiter_user_id: userId,
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.scheduled_date = dateFilter;
    }

    const schedules = await db.callSchedule.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            specialty: true,
            pipeline_stage: true,
            star_rating: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_SCHEDULE_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
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
    const { leadId, scheduledDate, scheduledMonth } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    if (!scheduledDate && !scheduledMonth) {
      return NextResponse.json(
        { error: "Either scheduledDate or scheduledMonth is required" },
        { status: 400 }
      );
    }

    // Verify lead belongs to this recruiter
    const lead = await db.recruiterLead.findFirst({
      where: { id: Number(leadId), recruiter_user_id: userId, is_active: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const schedule = await db.callSchedule.create({
      data: {
        lead_id: Number(leadId),
        recruiter_user_id: userId,
        scheduled_date: scheduledDate ? new Date(scheduledDate) : null,
        scheduled_month: scheduledMonth || null,
        status: "scheduled",
      },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            specialty: true,
            pipeline_stage: true,
          },
        },
      },
    });

    // Create notification reminders based on schedule type
    const { createNotification } = await import("@/lib/notifications/create");
    if (scheduledDate) {
      // Day before reminder
      await createNotification({
        userId,
        category: "calendar",
        priority: "important",
        title: "Call reminder — tomorrow",
        message: `Call with ${lead.first_name} ${lead.last_name} is tomorrow`,
        actionUrl: "/recruiter/calendar",
        actionLabel: "View calendar",
        relatedEntityId: schedule.id,
        relatedEntityType: "call_schedule",
      });

      // Day of reminder
      await createNotification({
        userId,
        category: "calendar",
        priority: "important",
        title: "Call reminder — today",
        message: `Call with ${lead.first_name} ${lead.last_name} is today`,
        actionUrl: "/recruiter/calendar",
        actionLabel: "View calendar",
        relatedEntityId: schedule.id,
        relatedEntityType: "call_schedule",
      });

      // 30 min after (follow-up if no answer)
      await createNotification({
        userId,
        category: "calendar",
        priority: "info",
        title: "Call follow-up",
        message: `Did you reach ${lead.first_name} ${lead.last_name}? Log the call outcome.`,
        actionUrl: "/recruiter/calendar",
        actionLabel: "Log call",
        relatedEntityId: schedule.id,
        relatedEntityType: "call_schedule",
      });

      // Day after reminder
      await createNotification({
        userId,
        category: "calendar",
        priority: "info",
        title: "Post-call follow-up",
        message: `Check if ${lead.first_name} ${lead.last_name} needs any additional info after yesterday's call`,
        actionUrl: "/recruiter/calendar",
        actionLabel: "View calendar",
        relatedEntityId: schedule.id,
        relatedEntityType: "call_schedule",
      });
    } else if (scheduledMonth) {
      // Month range: create notification for 1st of that month
      await createNotification({
        userId,
        category: "calendar",
        priority: "info",
        title: "Calls scheduled this month",
        message: `You have calls scheduled for ${lead.first_name} ${lead.last_name} this month (${scheduledMonth})`,
        actionUrl: "/recruiter/calendar",
        actionLabel: "View calendar",
        relatedEntityId: schedule.id,
        relatedEntityType: "call_schedule",
      });
    }

    // ─── BOB status engine hook (non-blocking) ────────────────────
    // If a specific date was scheduled (not just a month range), treat
    // this as an interview-stage event and flip the lead status.
    // Month-range scheduling is more of a "tentative" so we don't flip.
    if (scheduledDate) {
      try {
        await onInterviewScheduled({
          leadId: lead.id,
          scheduledAt: new Date(scheduledDate),
          actorUserId: userId,
        });
        console.log(`[BOB HOOK] onInterviewScheduled fired for lead ${lead.id}, scheduled: ${scheduledDate}`);
      } catch (bobErr) {
        console.error("[BOB HOOK] Failed to fire interview-scheduled hook:", bobErr);
        // Non-blocking — schedule was already created
      }
    }

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_SCHEDULE_POST]", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
