import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const checklistRequestId = Number(id);

    // Find the checklist request
    const checklistRequest = await db.checklistRequest.findUnique({
      where: { id: checklistRequestId },
      include: {
        candidate_user: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        checklist_template: {
          select: { name: true },
        },
      },
    });

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist request not found" },
        { status: 404 }
      );
    }

    // Don't send reminder if already completed
    if (checklistRequest.status === "completed") {
      return NextResponse.json(
        { error: "Checklist is already completed" },
        { status: 400 }
      );
    }

    // Check 24-hour cooldown
    const lastCreatedAt = new Date(checklistRequest.created_at);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (lastCreatedAt > twentyFourHoursAgo) {
      return NextResponse.json(
        { error: "Please wait at least 24 hours before sending a reminder" },
        { status: 400 }
      );
    }

    // Send reminder email
    try {
      const candidateEmail = checklistRequest.candidate_user.email;
      const candidateName = `${checklistRequest.candidate_user.first_name} ${checklistRequest.candidate_user.last_name}`;
      const checklistName = checklistRequest.checklist_template.name;
      const loginLink = `${getAppUrl()}/login`;

      await sendEmail({
        to: candidateEmail,
        templateKey: "checklist_reminder",
        variables: {
          candidate_name: candidateName,
          checklist_name: checklistName,
          login_link: loginLink,
        },
      });
      console.log(`[EMAIL] Checklist reminder sent to ${candidateEmail}`);
    } catch (emailErr) {
      console.error("[EMAIL] Failed to send reminder email:", emailErr);
      // Still return success since the reminder was attempted
    }

    return NextResponse.json({
      success: true,
      message: `Reminder email sent to ${checklistRequest.candidate_user.email}`,
    });
  } catch (error) {
    console.error("Remind POST error:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
