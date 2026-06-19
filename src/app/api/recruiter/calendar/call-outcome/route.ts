import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_OUTCOMES = ["good", "no_answer", "voicemail", "not_interested"];

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
    const {
      callScheduleId,
      leadId,
      outcome,
      remark,
      nextAction,
      rescheduleDate,
      rescheduleMonth,
      pipelineStage,
    } = body;

    if (!callScheduleId || !leadId || !outcome) {
      return NextResponse.json(
        { error: "callScheduleId, leadId, and outcome are required" },
        { status: 400 }
      );
    }

    if (!VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json(
        { error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify schedule belongs to this recruiter
    const schedule = await db.callSchedule.findFirst({
      where: { id: Number(callScheduleId), recruiter_user_id: userId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Call schedule not found" },
        { status: 404 }
      );
    }

    // Verify lead belongs to this recruiter
    const lead = await db.recruiterLead.findFirst({
      where: { id: Number(leadId), recruiter_user_id: userId, is_active: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Determine the schedule status based on outcome
    let scheduleStatus: string;
    switch (outcome) {
      case "good":
        scheduleStatus = "completed";
        break;
      case "no_answer":
        scheduleStatus = "no_answer";
        break;
      case "voicemail":
        scheduleStatus = "completed";
        break;
      case "not_interested":
        scheduleStatus = "completed";
        break;
      default:
        scheduleStatus = "completed";
    }

    // If rescheduling, mark the current schedule as "rescheduled"
    if (rescheduleDate || rescheduleMonth) {
      scheduleStatus = "rescheduled";
    }

    // Create the CallLog entry
    const callLog = await db.callLog.create({
      data: {
        lead_id: Number(leadId),
        call_schedule_id: Number(callScheduleId),
        recruiter_user_id: userId,
        outcome,
        remark: remark || null,
        next_action: nextAction || null,
      },
    });

    // Update the CallSchedule status
    await db.callSchedule.update({
      where: { id: Number(callScheduleId) },
      data: { status: scheduleStatus },
    });

    // If rescheduleDate or rescheduleMonth provided, create a new CallSchedule
    let newSchedule = null;
    if (rescheduleDate || rescheduleMonth) {
      newSchedule = await db.callSchedule.create({
        data: {
          lead_id: Number(leadId),
          recruiter_user_id: userId,
          scheduled_date: rescheduleDate ? new Date(rescheduleDate) : null,
          scheduled_month: rescheduleMonth || null,
          status: "scheduled",
        },
      });

      // Create notification for reschedule
      await db.notification.create({
        data: {
          user_id: userId,
          message: `Call rescheduled with ${lead.first_name} ${lead.last_name}${rescheduleDate ? ` for ${new Date(rescheduleDate).toLocaleDateString()}` : ` for ${rescheduleMonth}`}`,
          type: "call_rescheduled",
          related_entity_id: newSchedule.id,
        },
      });
    }

    // Update lead's pipeline_stage via the BOB status engine
    // (routes through changeStatus so it logs activity + recomputes tag
    //  + handles Company Pool movement + fires notifications)
    let updatedLead = null;
    if (outcome === "not_interested") {
      const { changeStatus } = await import("@/lib/bob/status-engine");
      await changeStatus({
        leadId: Number(leadId),
        newStatus: "not_interested",
        actorUserId: userId,
        actorType: "recruiter",
        reason: "Marked Not Interested after call",
      });
      updatedLead = await db.recruiterLead.findUnique({ where: { id: Number(leadId) } });
    } else if (pipelineStage) {
      const { changeStatus } = await import("@/lib/bob/status-engine");
      const { ALL_STATUSES } = await import("@/lib/bob/types");
      if (ALL_STATUSES.includes(pipelineStage as any)) {
        await changeStatus({
          leadId: Number(leadId),
          newStatus: pipelineStage as any,
          actorUserId: userId,
          actorType: "recruiter",
          reason: "Status changed after call",
        });
      }
      updatedLead = await db.recruiterLead.findUnique({ where: { id: Number(leadId) } });
    }

    return NextResponse.json({
      callLog,
      scheduleStatus,
      newSchedule,
      updatedLead,
    }, { status: 201 });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_CALL_OUTCOME_POST]", error);
    return NextResponse.json(
      { error: "Failed to record call outcome" },
      { status: 500 }
    );
  }
}
