import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper: generate follow-up reminders for a specific_date schedule
async function generateSpecificDateReminders(
  leadId: number,
  scheduleId: number,
  recruiterUserId: number,
  scheduledDate: Date
) {
  const dayBefore = new Date(scheduledDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0, 0);

  const dayOf = new Date(scheduledDate);
  dayOf.setHours(8, 0, 0, 0);

  const thirtyMinAfter = new Date(scheduledDate);
  thirtyMinAfter.setMinutes(thirtyMinAfter.getMinutes() + 30);

  const dayAfterNoUpdate = new Date(scheduledDate);
  dayAfterNoUpdate.setDate(dayAfterNoUpdate.getDate() + 1);
  dayAfterNoUpdate.setHours(9, 0, 0, 0);

  await db.followUpReminder.createMany({
    data: [
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "day_before", scheduled_for: dayBefore },
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "day_of", scheduled_for: dayOf },
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "thirty_min_after", scheduled_for: thirtyMinAfter },
      { lead_id: leadId, call_schedule_id: scheduleId, recruiter_user_id: recruiterUserId, reminder_type: "day_after_no_update", scheduled_for: dayAfterNoUpdate },
    ],
  });
}

// Helper: generate follow-up reminders for a month_range schedule
async function generateMonthRangeReminders(
  leadId: number,
  scheduleId: number,
  recruiterUserId: number,
  scheduledMonth: number,
  scheduledYear: number
) {
  const firstDay = new Date(scheduledYear, scheduledMonth - 1, 1, 9, 0, 0, 0);

  await db.followUpReminder.create({
    data: {
      lead_id: leadId,
      call_schedule_id: scheduleId,
      recruiter_user_id: recruiterUserId,
      reminder_type: "month_range_daily",
      scheduled_for: firstDay,
    },
  });
}

// POST: Create new recruiter lead
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
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
      first_name,
      last_name,
      phone,
      email,
      job_title,
      specialty,
      reached_for,
      source,
      source_other,
      star_rating,
      pipeline_stage,
      schedule_type,
      scheduled_date,
      scheduled_month,
      scheduled_year,
      remark,
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !phone || !job_title || !specialty || !reached_for) {
      return NextResponse.json(
        { error: "Missing required fields: first_name, last_name, phone, job_title, specialty, reached_for" },
        { status: 400 }
      );
    }

    // Check if email matches a candidate user
    let isPlatformCandidate = false;
    let linkedCandidateUserId: number | null = null;

    if (email) {
      const candidateUser = await db.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      if (candidateUser && candidateUser.role === "candidate") {
        isPlatformCandidate = true;
        linkedCandidateUserId = candidateUser.id;
      }
    }

    // Create the lead
    const lead = await db.recruiterLead.create({
      data: {
        recruiter_user_id: userId,
        organization_id: organizationId,
        first_name,
        last_name,
        phone,
        email: email || null,
        job_title,
        specialty,
        reached_for,
        source: source || "cold_call",
        source_other: source_other || null,
        star_rating: star_rating || null,
        pipeline_stage: pipeline_stage || "new_lead",
        is_platform_candidate: isPlatformCandidate,
        linked_candidate_user_id: linkedCandidateUserId,
      },
      include: {
        recruiter_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        linked_candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
        call_schedules: true,
        call_logs: true,
        follow_up_reminders: true,
      },
    });

    // If schedule info provided, create CallSchedule and auto-generate FollowUpReminders
    if (schedule_type) {
      const scheduleData: Record<string, unknown> = {
        lead_id: lead.id,
        recruiter_user_id: userId,
        schedule_type,
        remark: remark || null,
      };

      if (schedule_type === "specific_date" && scheduled_date) {
        scheduleData.scheduled_date = new Date(scheduled_date);
      } else if (schedule_type === "month_range" && scheduled_month && scheduled_year) {
        scheduleData.scheduled_month = Number(scheduled_month);
        scheduleData.scheduled_year = Number(scheduled_year);
      }

      const callSchedule = await db.callSchedule.create({
        data: scheduleData as Parameters<typeof db.callSchedule.create>[0]["data"],
      });

      // Generate reminders
      if (schedule_type === "specific_date" && scheduled_date) {
        await generateSpecificDateReminders(lead.id, callSchedule.id, userId, new Date(scheduled_date));
      } else if (schedule_type === "month_range" && scheduled_month && scheduled_year) {
        await generateMonthRangeReminders(lead.id, callSchedule.id, userId, Number(scheduled_month), Number(scheduled_year));
      }

      // Re-fetch lead with updated relations
      const updatedLead = await db.recruiterLead.findUnique({
        where: { id: lead.id },
        include: {
          recruiter_user: { select: { id: true, first_name: true, last_name: true, email: true } },
          linked_candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
          call_schedules: true,
          call_logs: true,
          follow_up_reminders: true,
        },
      });

      return NextResponse.json({ lead: updatedLead }, { status: 201 });
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_LEADS_POST]", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

// GET: List leads for authenticated recruiter
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const source = searchParams.get("source");
    const specialty = searchParams.get("specialty");
    const star_rating = searchParams.get("star_rating");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const search = searchParams.get("search");
    const sort_by = searchParams.get("sort_by") || "created_at";
    const sort_order = searchParams.get("sort_order") || "desc";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      is_deleted: false,
    };

    // For client_recruiter: only their own leads
    // For client_admin: all leads in their org
    if (userRole === "client_recruiter") {
      where.recruiter_user_id = userId;
    } else if (userRole === "client_admin" && organizationId) {
      where.organization_id = organizationId;
    }

    if (stage) where.pipeline_stage = stage;
    if (source) where.source = source;
    if (specialty) where.specialty = specialty;
    if (star_rating) where.star_rating = Number(star_rating);

    if (date_from || date_to) {
      const createdAt: Record<string, unknown> = {};
      if (date_from) createdAt.gte = new Date(date_from);
      if (date_to) createdAt.lte = new Date(date_to);
      where.created_at = createdAt;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: "insensitive" } },
        { last_name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const validSortFields = ["created_at", "first_name", "last_name", "pipeline_stage", "star_rating", "updated_at"];
    const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
    const sortOrder = sort_order === "asc" ? "asc" : "desc";

    const [leads, total] = await Promise.all([
      db.recruiterLead.findMany({
        where,
        include: {
          recruiter_user: { select: { id: true, first_name: true, last_name: true, email: true } },
          linked_candidate: { select: { id: true, first_name: true, last_name: true } },
          call_schedules: { where: { status: "pending" }, take: 1 },
          follow_up_reminders: { where: { status: "pending" }, take: 1 },
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
      }),
      db.recruiterLead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[CALENDAR_LEADS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
