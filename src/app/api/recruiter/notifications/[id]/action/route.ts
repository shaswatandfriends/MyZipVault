import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification ID" },
        { status: 400 }
      );
    }

    // Verify notification belongs to this user
    const notification = await db.notification.findFirst({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, rescheduleDate, rescheduleMonth } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "called": {
        // Create a CallLog entry for the related lead
        if (notification.related_entity_type === "lead" && notification.related_entity_id) {
          const lead = await db.recruiterLead.findFirst({
            where: { id: notification.related_entity_id, recruiter_user_id: userId },
          });

          if (lead) {
            await db.callLog.create({
              data: {
                lead_id: lead.id,
                recruiter_user_id: userId,
                outcome: "good",
                remark: `Call logged from notification: ${notification.title || notification.message}`,
              },
            });

            // If lead is in new_lead stage, move to interested
            if (lead.pipeline_stage === "new_lead") {
              await db.recruiterLead.update({
                where: { id: lead.id },
                data: { pipeline_stage: "interested", updated_at: new Date() },
              });
            }
          }
        } else if (notification.related_entity_type === "call_schedule" && notification.related_entity_id) {
          // Mark the call schedule as completed
          const schedule = await db.callSchedule.findFirst({
            where: { id: notification.related_entity_id, recruiter_user_id: userId },
            include: { lead: true },
          });

          if (schedule) {
            await db.callSchedule.update({
              where: { id: schedule.id },
              data: { status: "completed" },
            });

            await db.callLog.create({
              data: {
                lead_id: schedule.lead_id,
                call_schedule_id: schedule.id,
                recruiter_user_id: userId,
                outcome: "good",
                remark: `Call completed from notification`,
              },
            });

            // Move lead forward in pipeline if applicable
            if (schedule.lead?.pipeline_stage === "new_lead") {
              await db.recruiterLead.update({
                where: { id: schedule.lead_id },
                data: { pipeline_stage: "interested", updated_at: new Date() },
              });
            }
          }
        }

        // Mark notification as read
        await db.notification.update({
          where: { id: notificationId },
          data: { is_read: true },
        });

        return NextResponse.json({ success: true, action: "called" });
      }

      case "reschedule": {
        // Create a new CallSchedule for the related lead
        let leadId: number | null = null;

        if (notification.related_entity_type === "lead" && notification.related_entity_id) {
          leadId = notification.related_entity_id;
        } else if (notification.related_entity_type === "call_schedule" && notification.related_entity_id) {
          const schedule = await db.callSchedule.findFirst({
            where: { id: notification.related_entity_id, recruiter_user_id: userId },
          });
          if (schedule) {
            leadId = schedule.lead_id;
            // Mark old schedule as rescheduled
            await db.callSchedule.update({
              where: { id: schedule.id },
              data: { status: "rescheduled" },
            });
          }
        }

        if (leadId) {
          const scheduleData: {
            lead_id: number;
            recruiter_user_id: number;
            scheduled_date: Date | null;
            scheduled_month: string | null;
            status: string;
          } = {
            lead_id: leadId,
            recruiter_user_id: userId,
            scheduled_date: rescheduleDate ? new Date(rescheduleDate) : null,
            scheduled_month: rescheduleMonth || null,
            status: "scheduled",
          };

          await db.callSchedule.create({ data: scheduleData });

          // Create a new notification for the rescheduled call
          const lead = await db.recruiterLead.findFirst({ where: { id: leadId } });
          if (lead) {
            const newMessage = rescheduleDate
              ? `Call rescheduled with ${lead.first_name} ${lead.last_name} for ${new Date(rescheduleDate).toLocaleString()}`
              : rescheduleMonth
                ? `Call rescheduled with ${lead.first_name} ${lead.last_name} for ${rescheduleMonth}`
                : `Call rescheduled with ${lead.first_name} ${lead.last_name}`;

            await db.notification.create({
              data: {
                user_id: userId,
                title: `Rescheduled Call: ${lead.first_name} ${lead.last_name}`,
                message: newMessage,
                type: "call_scheduled",
                related_entity_id: leadId,
                related_entity_type: "lead",
              },
            });
          }
        }

        // Mark notification as read
        await db.notification.update({
          where: { id: notificationId },
          data: { is_read: true },
        });

        return NextResponse.json({ success: true, action: "reschedule" });
      }

      case "snooze": {
        // Snooze for 1 hour
        const snoozedUntil = new Date();
        snoozedUntil.setHours(snoozedUntil.getHours() + 1);

        await db.notification.update({
          where: { id: notificationId },
          data: { snoozed_until: snoozedUntil },
        });

        return NextResponse.json({
          success: true,
          action: "snooze",
          snoozedUntil: snoozedUntil.toISOString(),
        });
      }

      case "not_interested": {
        // Update lead pipeline_stage to not_interested
        let targetLeadId: number | null = null;

        if (notification.related_entity_type === "lead" && notification.related_entity_id) {
          targetLeadId = notification.related_entity_id;
        } else if (notification.related_entity_type === "call_schedule" && notification.related_entity_id) {
          const schedule = await db.callSchedule.findFirst({
            where: { id: notification.related_entity_id, recruiter_user_id: userId },
          });
          if (schedule) {
            targetLeadId = schedule.lead_id;
          }
        }

        if (targetLeadId) {
          await db.recruiterLead.update({
            where: { id: targetLeadId },
            data: { pipeline_stage: "not_interested", updated_at: new Date() },
          });

          // Create a call log for the not interested outcome
          await db.callLog.create({
            data: {
              lead_id: targetLeadId,
              recruiter_user_id: userId,
              outcome: "not_interested",
              remark: "Marked not interested from notification",
            },
          });
        }

        // Mark notification as read
        await db.notification.update({
          where: { id: notificationId },
          data: { is_read: true },
        });

        return NextResponse.json({ success: true, action: "not_interested" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[RECRUITER_NOTIFICATION_ACTION]", error);
    return NextResponse.json(
      { error: "Failed to process notification action" },
      { status: 500 }
    );
  }
}
