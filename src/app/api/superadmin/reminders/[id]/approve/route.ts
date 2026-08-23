import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const adminUserId = Number((session.user as Record<string, unknown>).id);

    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const reminderId = parseInt(id);

    const reminder = await db.pendingReminder.findUnique({
      where: { id: reminderId },
      include: {
        rule: { include: { email_template: true } },
        target_user: { select: { id: true, email: true } },
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    if (reminder.status !== "awaiting_approval") {
      return NextResponse.json({ error: "Reminder is not awaiting approval" }, { status: 400 });
    }

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
        console.error("[SUPERADMIN_REMINDER_APPROVE_EMAIL]", emailError);
      }
    }

    await db.pendingReminder.update({
      where: { id: reminderId },
      data: {
        status: "sent",
        actioned_by: adminUserId,
        actioned_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_REMINDER_APPROVE]", error);
    return NextResponse.json(
      { error: "Failed to approve reminder" },
      { status: 500 }
    );
  }
}
