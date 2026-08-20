import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/feedback — receive feedback from the landing page
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Store feedback as a notification for all super_admins
    const superAdmins = await db.user.findMany({
      where: { role: "super_admin", account_status: "active" },
      select: { id: true },
    });

    if (superAdmins.length > 0) {
      await db.notification.createMany({
        data: superAdmins.map((admin) => ({
          user_id: admin.id,
          title: "New Feedback Received",
          message: `${email}: ${message.substring(0, 200)}`,
          type: "feedback",
          category: "system",
          priority: "info",
          is_read: false,
          metadata: JSON.stringify({ email, full_message: message }),
        })),
      });
    }

    // Also log to audit
    console.log(`[FEEDBACK] ${email}: ${message.substring(0, 100)}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FEEDBACK_POST]", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
