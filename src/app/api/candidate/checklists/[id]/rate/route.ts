import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChecklistValidityDays } from "@/lib/checklist-settings";

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

    // Block rating on completed or expired requests
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

    // If this is a reuse_pending request, the candidate chose "Complete New"
    // → transition to in_progress. We also need to supersede the old
    // response and create a fresh one (the old candidate_response_id link
    // will be replaced).
    let oldResponseIdToSupersede: number | null = null;
    if (checklistRequest.status === "reuse_pending") {
      if (checklistRequest.candidate_response_id) {
        oldResponseIdToSupersede = checklistRequest.candidate_response_id;
      }
      // Unlink the old response so a fresh one gets created below
      await db.checklistRequest.update({
        where: { id: requestId },
        data: {
          status: "in_progress",
          candidate_response_id: null,
          completion_pct: 0,
          opened_at: new Date(),
        },
      });
      checklistRequest.candidate_response_id = null;
      checklistRequest.status = "in_progress";
    }

    // Get or create candidate response
    let responseId = checklistRequest.candidate_response_id;

    if (!responseId) {
      const validityDays = await getChecklistValidityDays();
      const response = await db.candidateChecklistResponse.create({
        data: {
          candidate_user_id: userId,
          checklist_template_id: checklistRequest.checklist_template_id,
          status: "active",
          valid_until: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
        },
      });
      responseId = response.id;

      await db.checklistRequest.update({
        where: { id: requestId },
        data: { candidate_response_id: responseId },
      });

      // If we just superseded an old response, mark it now
      if (oldResponseIdToSupersede) {
        await db.candidateChecklistResponse.update({
          where: { id: oldResponseIdToSupersede },
          data: { superseded_by_id: responseId },
        });
      }
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
