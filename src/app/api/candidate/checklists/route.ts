import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
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

    // Fetch all checklist requests for this candidate with template + skills
    const requests = await db.checklistRequest.findMany({
      where: { candidate_user_id: userId },
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
            id: true,
            first_name: true,
            last_name: true,
            organization: {
              select: { name: true },
            },
          },
        },
        candidate_response: {
          include: {
            skill_ratings: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formatted = requests.map((req) => ({
      id: req.id,
      status: req.status,
      completionPct: req.completion_pct,
      openedAt: req.opened_at,
      createdAt: req.created_at,
      candidateResponseId: req.candidate_response_id,
      template: {
        id: req.checklist_template.id,
        profession: req.checklist_template.profession,
        specialty: req.checklist_template.specialty,
        name: req.checklist_template.name,
        jobTitle: req.checklist_template.job_title,
        isActive: req.checklist_template.is_active,
        skills: req.checklist_template.skills.map((s) => ({
          id: s.id,
          skillName: s.skill_name,
          category: s.category,
          questionType: s.question_type,
          sortOrder: s.sort_order,
          hasNaOption: s.has_na_option,
        })),
      },
      recruiter: {
        id: req.client_user.id,
        name: `${req.client_user.first_name} ${req.client_user.last_name}`,
        organization: req.client_user.organization?.name || "Unknown",
      },
      existingRatings: req.candidate_response?.skill_ratings.map((r) => ({
        skillId: r.skill_id,
        ratingValue: r.rating_value,
        isNa: r.is_na,
      })) || [],
      responseStatus: req.candidate_response?.status || null,
      submittedAt: req.candidate_response?.submitted_at || null,
    }));

    return NextResponse.json({ checklists: formatted });
  } catch (error) {
    console.error("[CANDIDATE_CHECKLISTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}
