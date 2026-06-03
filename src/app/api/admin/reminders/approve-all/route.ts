import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function PUT() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const adminUserId = Number(session.user.id);

    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find all pending reminders awaiting approval
    const pendingReminders = await db.pendingReminder.findMany({
      where: { status: "awaiting_approval" },
      include: {
        rule: { include: { email_template: true } },
        target_user: { select: { id: true, email: true } },
      },
    });

    const now = new Date();
    let approved = 0;

    for (const reminder of pendingReminders) {
      // Send email if template exists
      if (reminder.rule.email_template && reminder.target_user?.email) {
        try {
          await sendEmail({
            to: reminder.target_user.email,
            templateKey: reminder.rule.email_template.template_key,
            variables: {
              candidate_name: reminder.target_user.email.split("@")[0],
              message: reminder.message_preview,
            },
          });
        } catch (emailError) {
          console.error("[ADMIN_REMINDER_APPROVE_ALL_EMAIL]", emailError);
        }
      }

      await db.pendingReminder.update({
        where: { id: reminder.id },
        data: {
          status: "sent",
          actioned_by: adminUserId,
          actioned_at: now,
        },
      });

      approved++;
    }

    return NextResponse.json({ approved });
  } catch (error) {
    console.error("[ADMIN_REMINDER_APPROVE_ALL]", error);
    return NextResponse.json(
      { error: "Failed to approve all reminders" },
      { status: 500 }
    );
  }
}
