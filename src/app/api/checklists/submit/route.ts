import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalcProfileCompletion } from "@/lib/profile-completion";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { checklistRequestId, signature } = body;

    if (!checklistRequestId || !signature) {
      return NextResponse.json(
        { error: "Checklist request ID and signature are required" },
        { status: 400 }
      );
    }

    const checklistRequest = await db.checklistRequest.findFirst({
      where: {
        id: checklistRequestId,
        candidate_user_id: userId,
      },
      include: {
        candidate_response: {
          include: { skill_ratings: true },
        },
        checklist_template: {
          include: { skills: true },
        },
      },
    });

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist request not found" },
        { status: 404 }
      );
    }

    if (!checklistRequest.candidate_response) {
      return NextResponse.json(
        { error: "No response found. Please rate at least one skill first." },
        { status: 400 }
      );
    }

    // Verify all skills are rated
    const totalSkills = checklistRequest.checklist_template.skills.length;
    const ratedSkills = checklistRequest.candidate_response.skill_ratings.filter(
      (r) => r.rating_value !== null || r.is_na
    ).length;

    if (ratedSkills < totalSkills) {
      return NextResponse.json(
        { error: `Please rate all skills before submitting. ${ratedSkills}/${totalSkills} completed.` },
        { status: 400 }
      );
    }

    // Update the response with signature
    await db.candidateChecklistResponse.update({
      where: { id: checklistRequest.candidate_response_id! },
      data: {
        digital_signature: signature,
        candidate_name_signed: signature,
        signature_date: new Date(),
        submitted_at: new Date(),
        status: "submitted",
      },
    });

    // Update the request status
    await db.checklistRequest.update({
      where: { id: checklistRequestId },
      data: {
        status: "completed",
        completion_pct: 100,
      },
    });

    // Update candidate profile completion (Gap 17: use shared utility)
    await recalcProfileCompletion(userId);

    // ─── Notifications: candidate + recruiter ──────────────────────
    try {
      const { createNotification } = await import("@/lib/notifications/create");

      // Candidate notification (info)
      await createNotification({
        userId,
        category: "compliance",
        priority: "info",
        title: "Checklist submitted ✅",
        message: "Your checklist has been submitted.",
        actionUrl: "/checklists",
        actionLabel: "View",
        relatedEntityId: checklistRequestId,
        relatedEntityType: "checklist_request",
      });

      // Recruiter notification (important) — uses client_user_id as recruiter's userId
      const candidate = await db.user.findUnique({
        where: { id: userId },
        select: { first_name: true, last_name: true },
      });
      const candidateName =
        `${candidate?.first_name ?? ""} ${candidate?.last_name ?? ""}`.trim() ||
        "Candidate";

      await createNotification({
        userId: checklistRequest.client_user_id,
        category: "compliance",
        priority: "important",
        title: "Checklist completed 📋",
        message: `${candidateName} completed their checklist.`,
        actionUrl: `/recruiter/candidates/${userId}`,
        actionLabel: "View candidate",
        relatedEntityId: checklistRequestId,
        relatedEntityType: "checklist_request",
      });
    } catch (notifErr) {
      console.error("[CHECKLIST_SUBMIT] Failed to send notifications:", notifErr);
      // Non-blocking
    }

    return NextResponse.json({
      message: "Checklist submitted successfully",
    });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit checklist" },
      { status: 500 }
    );
  }
}
