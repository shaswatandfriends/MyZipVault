import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Cron endpoint for midnight tasks
export async function GET() {
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);

    // 1. Reset quick_override_active for candidates where quick_override_date = yesterday
    const overrideReset = await db.candidateCalendarSetting.updateMany({
      where: {
        quick_override_active: true,
        quick_override_date: { lte: yesterdayEnd },
      },
      data: {
        quick_override_active: false,
        quick_override_date: null,
      },
    });

    // 2. Check shift requests past expires_at, set status=expired, notify recruiter
    const expiredShifts = await db.shiftRequest.findMany({
      where: {
        status: "pending",
        expires_at: { lt: now },
      },
      include: {
        recruiter_user: { select: { id: true } },
        candidate_user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    let expiredCount = 0;

    for (const shift of expiredShifts) {
      // Update status to expired
      await db.shiftRequest.update({
        where: { id: shift.id },
        data: { status: "expired" },
      });

      // Notify recruiter
      await db.notification.create({
        data: {
          user_id: shift.recruiter_user_id,
          message: `Shift request for ${shift.facility_name} sent to ${shift.candidate_user.first_name || ""} ${shift.candidate_user.last_name || ""} has expired without a response.`,
          type: "shift_expired",
          related_entity_id: shift.id,
          action_data: JSON.stringify({ shift_request_id: shift.id }),
        },
      });

      // Notify candidate
      await db.notification.create({
        data: {
          user_id: shift.candidate_user_id,
          message: `A shift request from ${shift.facility_name} has expired.`,
          type: "shift_expired",
          related_entity_id: shift.id,
        },
      });

      expiredCount++;
    }

    return NextResponse.json({
      overrides_reset: overrideReset.count,
      shifts_expired: expiredCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[CRON_CALENDAR_MIDNIGHT_GET]", error);
    return NextResponse.json({ error: "Failed to run midnight tasks" }, { status: 500 });
  }
}
