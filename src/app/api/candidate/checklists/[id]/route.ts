import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
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

    const checklistRequest = await db.checklistRequest.findUnique({
      where: { id: requestId },
      include: {
        checklist_template: {
          include: {
            skills: {
              orderBy: { sort_order: "asc" },
            },
          },
        },
        client_user: {
          select: {
            first_name: true,
            last_name: true,
            organization: { select: { name: true } },
          },
        },
        candidate_response: {
          include: {
            skill_ratings: true,
          },
        },
      },
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

    const skills = checklistRequest.checklist_template.skills.map((skill) => ({
      id: skill.id,
      skillName: skill.skill_name,
      category: skill.category,
      questionType: skill.question_type,
      sortOrder: skill.sort_order,
      hasNaOption: skill.has_na_option,
    }));

    const ratings: Record<number, { id: number; ratingValue: string | null; isNa: boolean }> = {};
    if (checklistRequest.candidate_response) {
      for (const r of checklistRequest.candidate_response.skill_ratings) {
        ratings[r.skill_id] = {
          id: r.id,
          ratingValue: r.rating_value,
          isNa: r.is_na,
        };
      }
    }

    // Calculate completion
    const totalSkills = skills.length;
    const ratedSkills = skills.filter((s) => {
      const rating = ratings[s.id];
      return rating && ((rating.ratingValue !== null && rating.ratingValue !== "") || rating.isNa);
    }).length;
    const completionPct = totalSkills > 0 ? Math.round((ratedSkills / totalSkills) * 100) : 0;

    return NextResponse.json({
      checklistRequest: {
        id: checklistRequest.id,
        status: checklistRequest.status,
        completionPct: checklistRequest.completion_pct,
        createdAt: checklistRequest.created_at,
      },
      template: {
        id: checklistRequest.checklist_template.id,
        name: checklistRequest.checklist_template.name,
        profession: checklistRequest.checklist_template.profession,
        specialty: checklistRequest.checklist_template.specialty,
      },
      client: {
        firstName: checklistRequest.client_user.first_name,
        lastName: checklistRequest.client_user.last_name,
        organizationName: checklistRequest.client_user.organization?.name,
      },
      candidateResponse: checklistRequest.candidate_response
        ? {
            id: checklistRequest.candidate_response.id,
            status: checklistRequest.candidate_response.status,
            submittedAt: checklistRequest.candidate_response.submitted_at,
            digitalSignature: checklistRequest.candidate_response.digital_signature,
            candidateNameSigned: checklistRequest.candidate_response.candidate_name_signed,
            validUntil: checklistRequest.candidate_response.valid_until,
          }
        : null,
      skills,
      ratings,
      ratedSkills,
      totalSkills,
      completionPct,
    });
  } catch (error) {
    console.error("Checklist detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}
