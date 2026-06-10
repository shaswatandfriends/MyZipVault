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

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const requestId = Number(id);
    const body = await request.json();
    const { skillId, ratingValue, isNa } = body;

    if (!skillId) {
      return NextResponse.json(
        { error: "skillId is required" },
        { status: 400 }
      );
    }

    // Get checklist request
    const checklistRequest = await db.checklistRequest.findUnique({
      where: { id: requestId },
    });

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

    // Get or create candidate response
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
        where: { id: requestId },
        data: { candidate_response_id: responseId },
      });
    }

    // Upsert the rating
    const existingRating = await db.skillRating.findUnique({
      where: {
        checklist_response_id_skill_id: {
          checklist_response_id: responseId,
          skill_id: Number(skillId),
        },
      },
    });

    let rating;
    if (existingRating) {
      rating = await db.skillRating.update({
        where: { id: existingRating.id },
        data: {
          rating_value: ratingValue ?? null,
          is_na: isNa ?? false,
          updated_at: new Date(),
        },
      });
    } else {
      rating = await db.skillRating.create({
        data: {
          checklist_response_id: responseId,
          skill_id: Number(skillId),
          rating_value: ratingValue ?? null,
          is_na: isNa ?? false,
        },
      });
    }

    // Calculate completion percentage
    const allSkills = await db.skill.findMany({
      where: { checklist_template_id: checklistRequest.checklist_template_id },
    });
    const allRatings = await db.skillRating.findMany({
      where: { checklist_response_id: responseId },
    });

    const totalSkills = allSkills.length;
    const ratedSkills = allSkills.filter((s) => {
      const r = allRatings.find((rt) => rt.skill_id === s.id);
      return r && (r.rating_value !== null && r.rating_value !== "") || (r && r.is_na);
    }).length;
    const completionPct = totalSkills > 0 ? Math.round((ratedSkills / totalSkills) * 100) : 0;

    // Update completion on the request
    await db.checklistRequest.update({
      where: { id: requestId },
      data: { completion_pct: completionPct },
    });

    return NextResponse.json({
      rating: {
        id: rating.id,
        skillId: rating.skill_id,
        ratingValue: rating.rating_value,
        isNa: rating.is_na,
      },
      completionPct,
      ratedSkills,
      totalSkills,
    });
  } catch (error) {
    console.error("Rate error:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}
