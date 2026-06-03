import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const adminUserId = Number(session.user.id);

    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const reminderId = parseInt(id);

    const reminder = await db.pendingReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    if (reminder.status !== "awaiting_approval") {
      return NextResponse.json({ error: "Reminder is not awaiting approval" }, { status: 400 });
    }

    // Set status = "skipped", actioned_by, actioned_at
    await db.pendingReminder.update({
      where: { id: reminderId },
      data: {
        status: "skipped",
        actioned_by: adminUserId,
        actioned_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_REMINDER_SKIP]", error);
    return NextResponse.json(
      { error: "Failed to skip reminder" },
      { status: 500 }
    );
  }
}
