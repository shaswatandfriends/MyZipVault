import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);

    const body = await request.json();
    const { requestId, ratings, digitalSignature, candidateNameSigned } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    // Find the checklist request
    let checklistRequest: any = null;
    try {
      checklistRequest = await db.checklistRequest.findUnique({
        where: { id: requestId },
        include: {
          checklist_template: {
            include: { skills: true },
          },
        },
      });
    } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }

    if (!checklistRequest) {
      return NextResponse.json({ error: "Checklist request not found" }, { status: 404 });
    }

    if (checklistRequest.candidate_user_id !== userId) {
      return NextResponse.json({ error: "This request does not belong to you" }, { status: 403 });
    }

    const isSubmitting = !!digitalSignature;

    // Find or create the candidate response
    let response: any = null;
    if (checklistRequest.candidate_response_id) {
      try {
        response = await db.candidateChecklistResponse.findUnique({
          where: { id: checklistRequest.candidate_response_id },
        });
      } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }
    }

    if (!response) {
      // Create new response
      response = await db.candidateChecklistResponse.create({
        data: {
          candidate_user_id: userId,
          checklist_template_id: checklistRequest.checklist_template_id,
          status: isSubmitting ? "submitted" : "active",
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          submitted_at: isSubmitting ? new Date() : null,
          digital_signature: digitalSignature || null,
          candidate_name_signed: candidateNameSigned || null,
          signature_date: isSubmitting ? new Date() : null,
        },
      });

      // Link the response to the request
      await db.checklistRequest.update({
        where: { id: requestId },
        data: {
          candidate_response_id: response.id,
          opened_at: checklistRequest.opened_at || new Date(),
          status: isSubmitting ? "completed" : "opened",
        },
      });
    } else if (isSubmitting) {
      // Update existing response to submitted
      response = await db.candidateChecklistResponse.update({
        where: { id: response.id },
        data: {
          status: "submitted",
          submitted_at: new Date(),
          digital_signature: digitalSignature,
          candidate_name_signed: candidateNameSigned,
          signature_date: new Date(),
        },
      });

      await db.checklistRequest.update({
        where: { id: requestId },
        data: { status: "completed" },
      });
    }

    if (!response) {
      return NextResponse.json({ error: "Failed to create response" }, { status: 500 });
    }

    // Upsert skill ratings
    if (ratings && Array.isArray(ratings)) {
      for (const rating of ratings) {
        const { skillId, ratingValue, isNa } = rating;

        if (!skillId) continue;

        await db.skillRating.upsert({
          where: {
            checklist_response_id_skill_id: {
              checklist_response_id: response.id,
              skill_id: skillId,
            },
          },
          create: {
            checklist_response_id: response.id,
            skill_id: skillId,
            rating_value: ratingValue || null,
            is_na: isNa || false,
          },
          update: {
            rating_value: ratingValue || null,
            is_na: isNa || false,
            updated_at: new Date(),
          },
        });
      }
    }

    // Calculate completion percentage
    const totalSkills = checklistRequest.checklist_template.skills.length;
    const ratedCount = await db.skillRating.count({
      where: {
        checklist_response_id: response.id,
        OR: [
          { rating_value: { not: null } },
          { is_na: true },
        ],
      },
    });

    const completionPct = totalSkills > 0 ? Math.round((ratedCount / totalSkills) * 100) : 0;

    await db.checklistRequest.update({
      where: { id: requestId },
      data: { completion_pct: completionPct },
    });

    // Audit log
    await logAudit({
      userId,
      role: userRole,
      action: isSubmitting ? "submitted_checklist" : "updated_checklist_ratings",
      entityType: "candidate_checklist_response",
      entityId: response.id,
    });

    return NextResponse.json({
      success: true,
      responseId: response.id,
      status: response.status,
      completionPct,
    });
  } catch (error) {
    console.error("[CANDIDATE_CHECKLIST_SUBMIT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to save checklist" },
      { status: 500 }
    );
  }
}
