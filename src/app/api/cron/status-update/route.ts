import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update credentials with no expiration → active
    const activeResult = await db.credential.updateMany({
      where: {
        expiration_date: null,
        status: { not: "active" },
      },
      data: { status: "active" },
    });

    // Update credentials with expiration_date < now → expired
    const expiredResult = await db.credential.updateMany({
      where: {
        expiration_date: { lt: now },
        status: { not: "expired" },
      },
      data: { status: "expired" },
    });

    // Update credentials with expiration_date within 30 days → expiring_soon
    const expiringResult = await db.credential.updateMany({
      where: {
        expiration_date: { gte: now, lte: thirtyDaysFromNow },
        status: { not: "expiring_soon" },
      },
      data: { status: "expiring_soon" },
    });

    // Update credentials with expiration_date > 30 days → active
    const futureActiveResult = await db.credential.updateMany({
      where: {
        expiration_date: { gt: thirtyDaysFromNow },
        status: { not: "active" },
      },
      data: { status: "active" },
    });

    const credentialsUpdated =
      activeResult.count +
      expiredResult.count +
      expiringResult.count +
      futureActiveResult.count;

    // Update candidate_checklist_responses: if valid_until < now → expired
    const checklistsResult = await db.candidateChecklistResponse.updateMany({
      where: {
        valid_until: { lt: now },
        status: { not: "expired" },
      },
      data: { status: "expired" },
    });

    return NextResponse.json({
      credentials_updated: credentialsUpdated,
      checklists_updated: checklistsResult.count,
    });
  } catch (error) {
    console.error("[CRON_STATUS_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update statuses" },
      { status: 500 }
    );
  }
}
