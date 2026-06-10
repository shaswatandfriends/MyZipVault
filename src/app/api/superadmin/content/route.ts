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
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      professions,
      specialties,
      skillCategories,
      checklistTemplates,
      skills,
      referenceQuestions,
    ] = await Promise.all([
      db.profession.findMany({
        select: {
          id: true,
          name: true,
          is_active: true,
          sort_order: true,
          created_at: true,
        },
        orderBy: { sort_order: "asc" },
      }),
      db.specialty.findMany({
        select: {
          id: true,
          profession_id: true,
          name: true,
          is_active: true,
          sort_order: true,
          created_at: true,
        },
        orderBy: [{ profession_id: "asc" }, { sort_order: "asc" }],
      }),
      db.skillCategory.findMany({
        select: {
          id: true,
          specialty_id: true,
          name: true,
          sort_order: true,
          created_at: true,
        },
        orderBy: [{ specialty_id: "asc" }, { sort_order: "asc" }],
      }),
      db.checklistTemplate.findMany({
        select: {
          id: true,
          profession: true,
          specialty: true,
          name: true,
          is_active: true,
          profession_id: true,
          specialty_id: true,
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
          category_id: true,
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
      professions: professions.map((p) => ({
        id: p.id,
        name: p.name,
        isActive: p.is_active,
        sortOrder: p.sort_order,
        createdAt: p.created_at,
      })),
      specialties: specialties.map((s) => ({
        id: s.id,
        professionId: s.profession_id,
        name: s.name,
        isActive: s.is_active,
        sortOrder: s.sort_order,
        createdAt: s.created_at,
      })),
      skillCategories: skillCategories.map((c) => ({
        id: c.id,
        specialtyId: c.specialty_id,
        name: c.name,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
      })),
      checklistTemplates: checklistTemplates.map((t) => ({
        id: t.id,
        profession: t.profession,
        specialty: t.specialty,
        name: t.name,
        isActive: t.is_active,
        professionId: t.profession_id,
        specialtyId: t.specialty_id,
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
        categoryId: s.category_id,
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
    console.error("Superadmin Content GET error:", error);
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
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
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
      // ─── Professions ──────────────────────────────────────────
      case "profession": {
        switch (action) {
          case "create": {
            const profession = await db.profession.create({
              data: {
                name: data.name,
                is_active: data.isActive ?? true,
                sort_order: data.sortOrder ?? 0,
              },
            });
            return NextResponse.json({ success: true, profession });
          }
          case "update": {
            const profession = await db.profession.update({
              where: { id: data.id },
              data: {
                name: data.name,
                is_active: data.isActive,
                sort_order: data.sortOrder,
              },
            });
            return NextResponse.json({ success: true, profession });
          }
          case "delete": {
            await db.profession.delete({
              where: { id: data.id },
            });
            return NextResponse.json({ success: true, message: "Profession deleted" });
          }
          default:
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
      }

      // ─── Specialties ──────────────────────────────────────────
      case "specialty": {
        switch (action) {
          case "create": {
            const profession = await db.profession.findUnique({
              where: { id: data.professionId },
            });
            const specialty = await db.specialty.create({
              data: {
                profession_id: data.professionId,
                name: data.name,
                is_active: data.isActive ?? true,
                sort_order: data.sortOrder ?? 0,
              },
            });
            return NextResponse.json({
              success: true,
              specialty,
              professionName: profession?.name,
            });
          }
          case "update": {
            const specialty = await db.specialty.update({
              where: { id: data.id },
              data: {
                name: data.name,
                is_active: data.isActive,
                sort_order: data.sortOrder,
              },
            });
            return NextResponse.json({ success: true, specialty });
          }
          case "delete": {
            await db.specialty.delete({
              where: { id: data.id },
            });
            return NextResponse.json({ success: true, message: "Specialty deleted" });
          }
          default:
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
      }

      // ─── Skill Categories ─────────────────────────────────────
      case "skill_category": {
        switch (action) {
          case "create": {
            const category = await db.skillCategory.create({
              data: {
                specialty_id: data.specialtyId,
                name: data.name,
                sort_order: data.sortOrder ?? 0,
              },
            });
            return NextResponse.json({ success: true, category });
          }
          case "update": {
            const category = await db.skillCategory.update({
              where: { id: data.id },
              data: {
                name: data.name,
                sort_order: data.sortOrder,
              },
            });
            return NextResponse.json({ success: true, category });
          }
          case "delete": {
            await db.skill.updateMany({
              where: { category_id: data.id },
              data: { category_id: null },
            });
            await db.skillCategory.delete({
              where: { id: data.id },
            });
            return NextResponse.json({ success: true, message: "Skill category deleted" });
          }
          default:
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
      }

      // ─── Checklist Templates ──────────────────────────────────
      case "checklist_template": {
        switch (action) {
          case "create": {
            let professionName = data.profession || "";
            let specialtyName = data.specialty || "";
            if (data.professionId && !professionName) {
              const prof = await db.profession.findUnique({ where: { id: data.professionId } });
              professionName = prof?.name || "";
            }
            if (data.specialtyId && !specialtyName) {
              const spec = await db.specialty.findUnique({ where: { id: data.specialtyId } });
              specialtyName = spec?.name || "";
            }
            const template = await db.checklistTemplate.create({
              data: {
                profession: professionName,
                specialty: specialtyName,
                name: data.name,
                is_active: data.isActive ?? true,
                profession_id: data.professionId ?? null,
                specialty_id: data.specialtyId ?? null,
              },
            });
            return NextResponse.json({ success: true, template });
          }
          case "update": {
            let professionName = data.profession;
            let specialtyName = data.specialty;
            if (data.professionId) {
              const prof = await db.profession.findUnique({ where: { id: data.professionId } });
              professionName = prof?.name || professionName;
            }
            if (data.specialtyId) {
              const spec = await db.specialty.findUnique({ where: { id: data.specialtyId } });
              specialtyName = spec?.name || specialtyName;
            }
            const template = await db.checklistTemplate.update({
              where: { id: data.id },
              data: {
                profession: professionName,
                specialty: specialtyName,
                name: data.name,
                is_active: data.isActive,
                profession_id: data.professionId ?? undefined,
                specialty_id: data.specialtyId ?? undefined,
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

      // ─── Skills ──────────────────────────────────────────────
      case "skill": {
        switch (action) {
          case "create": {
            let categoryName = data.category || "";
            if (data.categoryId && !categoryName) {
              const cat = await db.skillCategory.findUnique({ where: { id: data.categoryId } });
              categoryName = cat?.name || "";
            }
            const skill = await db.skill.create({
              data: {
                checklist_template_id: data.checklistTemplateId,
                skill_name: data.skillName,
                category: categoryName,
                question_type: data.questionType,
                sort_order: data.sortOrder ?? 0,
                has_na_option: data.hasNaOption ?? true,
                category_id: data.categoryId ?? null,
              },
            });
            return NextResponse.json({ success: true, skill });
          }
          case "update": {
            let categoryName = data.category;
            if (data.categoryId) {
              const cat = await db.skillCategory.findUnique({ where: { id: data.categoryId } });
              categoryName = cat?.name || categoryName;
            }
            const skill = await db.skill.update({
              where: { id: data.id },
              data: {
                skill_name: data.skillName,
                category: categoryName,
                question_type: data.questionType,
                sort_order: data.sortOrder,
                has_na_option: data.hasNaOption,
                category_id: data.categoryId ?? undefined,
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

      // ─── Reference Questions ─────────────────────────────────
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
    console.error("Superadmin Content POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
