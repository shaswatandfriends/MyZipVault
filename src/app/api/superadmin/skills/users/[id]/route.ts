import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const responseId = parseInt(id, 10);
    if (isNaN(responseId)) {
      return NextResponse.json({ error: "Invalid response ID" }, { status: 400 });
    }

    const response = await db.candidateChecklistResponse.findUnique({
      where: { id: responseId },
      include: {
        candidate_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        checklist_template: {
          select: { id: true, profession: true, specialty: true, name: true, job_title: true },
          include: {
            skills: { orderBy: { sort_order: "asc" } },
          },
        },
        skill_ratings: true,
      },
    });

    if (!response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    // Group skills by category
    const categories = new Map<string, Array<{
      skillId: number;
      skillName: string;
      questionType: string;
      sortOrder: number;
      hasNaOption: boolean;
      ratingValue: string | null;
      isNa: boolean;
      ratingId: number | null;
    }>>();

    for (const skill of response.checklist_template.skills) {
      const rating = response.skill_ratings.find((r) => r.skill_id === skill.id);
      if (!categories.has(skill.category)) {
        categories.set(skill.category, []);
      }
      categories.get(skill.category)!.push({
        skillId: skill.id,
        skillName: skill.skill_name,
        questionType: skill.question_type,
        sortOrder: skill.sort_order,
        hasNaOption: skill.has_na_option,
        ratingValue: rating?.rating_value ?? null,
        isNa: rating?.is_na ?? false,
        ratingId: rating?.id ?? null,
      });
    }

    return NextResponse.json({
      id: response.id,
      status: response.status,
      validUntil: response.valid_until,
      submittedAt: response.submitted_at,
      digitalSignature: response.digital_signature,
      candidateNameSigned: response.candidate_name_signed,
      candidate: {
        id: response.candidate_user.id,
        firstName: response.candidate_user.first_name,
        lastName: response.candidate_user.last_name,
        email: response.candidate_user.email,
      },
      template: {
        id: response.checklist_template.id,
        profession: response.checklist_template.profession,
        specialty: response.checklist_template.specialty,
        name: response.checklist_template.name,
        jobTitle: response.checklist_template.job_title,
        totalSkills: response.checklist_template.skills.length,
      },
      categories: Array.from(categories.entries()).map(([category, skills]) => ({
        category,
        skills,
      })),
    });
  } catch (error) {
    console.error("Skills User Detail GET error:", error);
    return NextResponse.json({ error: "Failed to fetch response detail" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const responseId = parseInt(id, 10);
    if (isNaN(responseId)) {
      return NextResponse.json({ error: "Invalid response ID" }, { status: 400 });
    }

    const response = await db.candidateChecklistResponse.findUnique({
      where: { id: responseId },
    });
    if (!response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    await db.candidateChecklistResponse.delete({
      where: { id: responseId },
    });

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    await logAudit({
      userId: actionerId,
      role: "super_admin",
      action: "checklist_response_deleted",
      entityType: "candidate_checklist_response",
      entityId: responseId,
    });

    return NextResponse.json({ success: true, message: "Response deleted successfully" });
  } catch (error) {
    console.error("Skills User DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete response" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const responseId = parseInt(id, 10);
    if (isNaN(responseId)) {
      return NextResponse.json({ error: "Invalid response ID" }, { status: 400 });
    }

    const body = await request.json();
    const { ratings } = body as { ratings: Array<{ ratingId: number; ratingValue: string; isNa: boolean }> };

    if (!ratings || !Array.isArray(ratings)) {
      return NextResponse.json({ error: "Ratings array is required" }, { status: 400 });
    }

    // Update each rating
    for (const r of ratings) {
      await db.skillRating.update({
        where: { id: r.ratingId },
        data: {
          rating_value: r.ratingValue,
          is_na: r.isNa,
          updated_at: new Date(),
        },
      });
    }

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    await logAudit({
      userId: actionerId,
      role: "super_admin",
      action: "skill_updated",
      entityType: "candidate_checklist_response",
      entityId: responseId,
    });

    return NextResponse.json({ success: true, message: "Ratings updated successfully" });
  } catch (error) {
    console.error("Skills User PUT error:", error);
    return NextResponse.json({ error: "Failed to update ratings" }, { status: 500 });
  }
}
