import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { templateId } = await params;
    const id = Number(templateId);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await db.checklistTemplate.findUnique({
      where: { id },
      include: {
        skills: {
          orderBy: { sort_order: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Group skills by category
    const grouped = template.skills.reduce(
      (acc, skill) => {
        const cat = skill.category;
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push({
          id: skill.id,
          skillName: skill.skill_name,
          questionType: skill.question_type,
          sortOrder: skill.sort_order,
          hasNaOption: skill.has_na_option,
        });
        return acc;
      },
      {} as Record<string, Array<{
        id: number;
        skillName: string;
        questionType: string;
        sortOrder: number;
        hasNaOption: boolean;
      }>>
    );

    return NextResponse.json({
      template: {
        id: template.id,
        profession: template.profession,
        specialty: template.specialty,
        name: template.name,
        jobTitle: template.job_title,
        isActive: template.is_active,
      },
      categories: Object.entries(grouped).map(([category, skills]) => ({
        category,
        skills,
      })),
      totalSkills: template.skills.length,
      totalCategories: Object.keys(grouped).length,
    });
  } catch (error) {
    console.error("[PREVIEW_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch template preview" },
      { status: 500 }
    );
  }
}
