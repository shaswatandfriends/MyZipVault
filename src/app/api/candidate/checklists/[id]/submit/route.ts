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

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const requestId = Number(id);
    const body = await request.json();
    const { candidateNameSigned, signatureBase64, signature } = body;

    // Support both old (signature string) and new (candidateNameSigned + signatureBase64) format
    const finalSignature = signatureBase64 || signature || "";
    const finalNameSigned = candidateNameSigned || "";

    if (!finalSignature.trim() && !finalNameSigned.trim()) {
      return NextResponse.json(
        { error: "Digital signature and name are required" },
        { status: 400 }
      );
    }

    let checklistRequest: any = null;
    try {
      checklistRequest = await db.checklistRequest.findUnique({
        where: { id: requestId },
        include: {
          candidate_response: {
            include: { skill_ratings: true },
          },
        },
      });
    } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    if (checklistRequest.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (checklistRequest.status === "completed") {
      return NextResponse.json(
        { error: "Checklist already submitted" },
        { status: 400 }
      );
    }

    if (checklistRequest.status === "expired") {
      return NextResponse.json(
        { error: "This checklist request has expired" },
        { status: 400 }
      );
    }

    if (!checklistRequest.candidate_response) {
      return NextResponse.json(
        { error: "No response found. Please rate at least one skill first." },
        { status: 400 }
      );
    }

    // Verify all skills are rated (also reject empty string ratings)
    const templateSkills = await db.skill.findMany({
      where: { checklist_template_id: checklistRequest.checklist_template_id },
    });

    const unrated = templateSkills.filter((s) => {
      const r = checklistRequest.candidate_response!.skill_ratings.find(
        (rt) => rt.skill_id === s.id
      );
      return !r || (r.rating_value === null && !r.is_na) || (r.rating_value === "" && !r.is_na);
    });

    if (unrated.length > 0) {
      return NextResponse.json(
        {
          error: `${unrated.length} skill(s) still need ratings`,
          unratedCount: unrated.length,
        },
        { status: 400 }
      );
    }

    // Update the response with signature data
    await db.candidateChecklistResponse.update({
      where: { id: checklistRequest.candidate_response.id },
      data: {
        status: "submitted",
        submitted_at: new Date(),
        digital_signature: finalSignature.trim(),
        candidate_name_signed: finalNameSigned.trim() || null,
        signature_date: new Date(),
      },
    });

    // Update the checklist request
    await db.checklistRequest.update({
      where: { id: requestId },
      data: {
        status: "completed",
        completion_pct: 100,
      },
    });

    // ─── FIX #4: Notify the recruiter that the candidate submitted ───
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      const candidateName = (session.user as Record<string, unknown>).firstName || session.user?.email || "Candidate";
      const template = await db.checklistTemplate.findUnique({
        where: { id: checklistRequest.checklist_template_id },
        select: { name: true },
      }).catch(() => null);

      await createNotification({
        userId: checklistRequest.client_user_id,
        category: "checklist",
        priority: "high",
        title: `Checklist completed: ${template?.name || "Skills Checklist"}`,
        message: `${candidateName} has completed and submitted their ${template?.name || "skills checklist"}. You can now view the signed PDF.`,
        actionUrl: `/recruiter/requests`,
        actionLabel: "View checklist",
        relatedEntityId: requestId,
        relatedEntityType: "checklist_request",
      });
    } catch (notifErr) {
      console.error("[SUBMIT] Failed to notify recruiter:", notifErr);
    }

    // ─── FIX #6: Recalculate candidate profile completion ───
    try {
      const { recalcProfileCompletion } = await import("@/lib/profile-completion");
      await recalcProfileCompletion(userId);
    } catch (recalcErr) {
      console.error("[SUBMIT] Failed to recalc profile:", recalcErr);
    }

    // Update candidate's last_activity_at
    try {
      await db.user.update({
        where: { id: userId },
        data: { last_activity_at: new Date() },
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      message: "Checklist submitted successfully",
      completionPct: 100,
    });
  } catch (error) {
    console.error("Submit checklist error:", error);
    return NextResponse.json(
      { error: "Failed to submit checklist" },
      { status: 500 }
    );
  }
}
