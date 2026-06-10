import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const { checklistRequestId, skillId, ratingValue, isNa } = body;

    if (!checklistRequestId || !skillId) {
      return NextResponse.json(
        { error: "Checklist request ID and skill ID are required" },
        { status: 400 }
      );
    }

    const checklistRequest = await db.checklistRequest.findFirst({
      where: {
        id: checklistRequestId,
        candidate_user_id: userId,
        status: "sent",
      },
    });

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist request not found or not available for rating" },
        { status: 404 }
      );
    }

    let responseId = checklistRequest.candidate_response_id;

    if (!responseId) {
      const response = await db.candidateChecklistResponse.create({
        data: {
          candidate_user_id: userId,
          checklist_template_id: checklistRequest.checklist_template_id,
          status: "active",
          valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      responseId = response.id;

      await db.checklistRequest.update({
        where: { id: checklistRequestId },
        data: { candidate_response_id: responseId },
      });
    }

    const rating = await db.skillRating.upsert({
      where: {
        checklist_response_id_skill_id: {
          checklist_response_id: responseId,
          skill_id: skillId,
        },
      },
      create: {
        checklist_response_id: responseId,
        skill_id: skillId,
        rating_value: ratingValue ?? null,
        is_na: isNa ?? false,
      },
      update: {
        rating_value: ratingValue ?? null,
        is_na: isNa ?? false,
        updated_at: new Date(),
      },
    });

    // Update completion percentage
    const totalSkills = await db.skill.count({
      where: {
        checklist_template_id: checklistRequest.checklist_template_id,
      },
    });

    const ratedSkills = await db.skillRating.count({
      where: {
        checklist_response_id: responseId,
        OR: [
          { rating_value: { not: null } },
          { is_na: true },
        ],
      },
    });

    const completionPct = totalSkills > 0 ? Math.round((ratedSkills / totalSkills) * 100) : 0;

    await db.checklistRequest.update({
      where: { id: checklistRequestId },
      data: { completion_pct: completionPct },
    });

    return NextResponse.json({
      rating,
      completionPct,
    });
  } catch (error) {
    console.error("Rate error:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}
