import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const providedSecret = request.headers.get("x-cron-secret");
      if (providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find all users past 30-day grace period
    const usersToDelete = await db.user.findMany({
      where: {
        account_status: "suspended_deleting",
        deletion_requested_at: { lte: thirtyDaysAgo },
      },
    });

    let purged = 0;

    for (const user of usersToDelete) {
      try {
        // Delete related records (NOT audit_logs)
        await db.candidateProfile.deleteMany({
          where: { user_id: user.id },
        });

        await db.skillRating.deleteMany({
          where: {
            checklist_response: { candidate_user_id: user.id },
          },
        });

        await db.candidateChecklistResponse.deleteMany({
          where: { candidate_user_id: user.id },
        });

        await db.referenceResponse.deleteMany({
          where: {
            candidate_reference: { candidate_user_id: user.id },
          },
        });

        await db.candidateReference.deleteMany({
          where: { candidate_user_id: user.id },
        });

        await db.credential.deleteMany({
          where: { candidate_user_id: user.id },
        });

        await db.resume.deleteMany({
          where: { candidate_user_id: user.id },
        });

        await db.consentShare.deleteMany({
          where: { candidate_user_id: user.id },
        });

        await db.notification.deleteMany({
          where: { user_id: user.id },
        });

        // Delete the user record last
        await db.user.delete({
          where: { id: user.id },
        });

        purged++;
      } catch (err) {
        console.error(`[CRON_PURGE] Failed to purge user ${user.id}:`, err);
      }
    }

    return NextResponse.json({ purged });
  } catch (error) {
    console.error("[CRON_PURGE]", error);
    return NextResponse.json(
      { error: "Failed to purge accounts" },
      { status: 500 }
    );
  }
}
