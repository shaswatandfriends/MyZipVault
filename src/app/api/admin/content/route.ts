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
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [checklistTemplates, skills, referenceQuestions] = await Promise.all([
      db.checklistTemplate.findMany({
        select: {
          id: true,
          profession: true,
          specialty: true,
          name: true,
          is_active: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      }),
      db.skill.findMany({
        select: {
          id: true,
          checklist_template_id: true,
          skill_name: true,
          category: true,
          question_type: true,
          sort_order: true,
          has_na_option: true,
        },
        orderBy: [{ checklist_template_id: "asc" }, { sort_order: "asc" }],
      }),
      db.referenceQuestion.findMany({
        select: {
          id: true,
          employment_status: true,
          question_text: true,
          response_type: true,
          sort_order: true,
        },
        orderBy: [{ employment_status: "asc" }, { sort_order: "asc" }],
      }),
    ]);

    return NextResponse.json({
      checklistTemplates: checklistTemplates.map((t) => ({
        id: t.id,
        profession: t.profession,
        specialty: t.specialty,
        name: t.name,
        isActive: t.is_active,
        createdAt: t.created_at,
      })),
      skills: skills.map((s) => ({
        id: s.id,
        checklistTemplateId: s.checklist_template_id,
        skillName: s.skill_name,
        category: s.category,
        questionType: s.question_type,
        sortOrder: s.sort_order,
        hasNaOption: s.has_na_option,
      })),
      referenceQuestions: referenceQuestions.map((q) => ({
        id: q.id,
        employmentStatus: q.employment_status,
        questionText: q.question_text,
        responseType: q.response_type,
        sortOrder: q.sort_order,
      })),
    });
  } catch (error) {
    console.error("Admin Content GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, action, data } = body;

    if (!type || !action || !data) {
      return NextResponse.json(
        { error: "Type, action, and data are required" },
        { status: 400 }
      );
    }

    switch (type) {
      // ─── Checklist Templates ──────────────────────────────
      case "checklist_template": {
        switch (action) {
          case "create": {
            const template = await db.checklistTemplate.create({
              data: {
                profession: data.profession,
                specialty: data.specialty,
                name: data.name,
                is_active: data.isActive ?? true,
              },
            });
            return NextResponse.json({ success: true, template });
          }
          case "update": {
            const template = await db.checklistTemplate.update({
              where: { id: data.id },
              data: {
                profession: data.profession,
                specialty: data.specialty,
                name: data.name,
                is_active: data.isActive,
              },
            });
            return NextResponse.json({ success: true, template });
          }
          case "delete": {
            await db.checklistTemplate.delete({
              where: { id: data.id },
            });
            return NextResponse.json({ success: true, message: "Template deleted" });
          }
          default:
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
      }

      // ─── Skills ──────────────────────────────────────────
      case "skill": {
        switch (action) {
          case "create": {
            const skill = await db.skill.create({
              data: {
                checklist_template_id: data.checklistTemplateId,
                skill_name: data.skillName,
                category: data.category,
                question_type: data.questionType,
                sort_order: data.sortOrder ?? 0,
                has_na_option: data.hasNaOption ?? true,
              },
            });
            return NextResponse.json({ success: true, skill });
          }
          case "update": {
            const skill = await db.skill.update({
              where: { id: data.id },
              data: {
                skill_name: data.skillName,
                category: data.category,
                question_type: data.questionType,
                sort_order: data.sortOrder,
                has_na_option: data.hasNaOption,
              },
            });
            return NextResponse.json({ success: true, skill });
          }
          case "delete": {
            await db.skill.delete({
              where: { id: data.id },
            });
            return NextResponse.json({ success: true, message: "Skill deleted" });
          }
          default:
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
      }

      // ─── Reference Questions ─────────────────────────────
      case "reference_question": {
        switch (action) {
          case "create": {
            const question = await db.referenceQuestion.create({
              data: {
                employment_status: data.employmentStatus,
                question_text: data.questionText,
                response_type: data.responseType,
                sort_order: data.sortOrder ?? 0,
              },
            });
            return NextResponse.json({ success: true, question });
          }
          case "update": {
            const question = await db.referenceQuestion.update({
              where: { id: data.id },
              data: {
                employment_status: data.employmentStatus,
                question_text: data.questionText,
                response_type: data.responseType,
                sort_order: data.sortOrder,
              },
            });
            return NextResponse.json({ success: true, question });
          }
          case "delete": {
            await db.referenceQuestion.delete({
              where: { id: data.id },
            });
            return NextResponse.json({ success: true, message: "Question deleted" });
          }
          default:
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
      }

      default:
        return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin Content POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
