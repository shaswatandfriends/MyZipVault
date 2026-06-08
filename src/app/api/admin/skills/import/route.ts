import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_QUESTION_TYPES = ["rating_1_4", "yes_no", "text"];

interface ValidRow {
  profession: string;
  jobTitle: string;
  specialty: string;
  category: string;
  skillName: string;
  questionType: string;
  hasNaOption: string;
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

    const userId = Number((session.user as Record<string, unknown>).id);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json({ error: "Only .xlsx files are accepted" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    // Read and parse the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "buffer" });

    const wsName = wb.SheetNames.includes("Skills Data") ? "Skills Data" : wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    if (!ws) {
      return NextResponse.json({ error: "Could not find Skills Data sheet" }, { status: 400 });
    }

    const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Parse and validate rows
    const validRows: ValidRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "")) {
        continue;
      }

      const profession = String(row[0] ?? "").trim();
      const jobTitle = String(row[1] ?? "").trim();
      const specialty = String(row[2] ?? "").trim();
      const category = String(row[3] ?? "").trim();
      const skillName = String(row[4] ?? "").trim();
      const questionType = String(row[5] ?? "").trim();
      const hasNaOption = String(row[6] ?? "").trim();

      if (!profession || !jobTitle || !specialty || !category || !skillName) {
        continue;
      }

      const normalizedQt = VALID_QUESTION_TYPES.includes(questionType) ? questionType : "rating_1_4";

      validRows.push({
        profession,
        jobTitle,
        specialty,
        category,
        skillName,
        questionType: normalizedQt,
        hasNaOption: hasNaOption.toLowerCase() === "yes" ? "Yes" : "No",
      });
    }

    // Import valid rows
    let imported = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    for (const row of validRows) {
      // Find or create ChecklistTemplate
      let template = await db.checklistTemplate.findFirst({
        where: {
          profession: row.profession,
          specialty: row.specialty,
        },
      });

      if (!template) {
        template = await db.checklistTemplate.create({
          data: {
            profession: row.profession,
            specialty: row.specialty,
            name: `${row.jobTitle} - ${row.specialty} Skill Checklist`,
            job_title: row.jobTitle,
            is_active: true,
          },
        });
      }

      // Check if skill already exists (case-insensitive)
      const existingSkill = await db.skill.findFirst({
        where: {
          checklist_template_id: template.id,
          category: { mode: "insensitive", equals: row.category },
          skill_name: { mode: "insensitive", equals: row.skillName },
        },
      });

      if (existingSkill) {
        skipped++;
        skippedReasons.push(`Duplicate: ${row.profession} / ${row.jobTitle} / ${row.specialty} / ${row.category} / ${row.skillName}`);
        continue;
      }

      // Get max sort_order within category for this template
      const maxSortSkill = await db.skill.findFirst({
        where: {
          checklist_template_id: template.id,
          category: { mode: "insensitive", equals: row.category },
        },
        orderBy: { sort_order: "desc" },
        select: { sort_order: true },
      });

      const sortOrder = (maxSortSkill?.sort_order ?? -1) + 1;

      await db.skill.create({
        data: {
          checklist_template_id: template.id,
          skill_name: row.skillName,
          category: row.category,
          question_type: row.questionType,
          sort_order: sortOrder,
          has_na_option: row.hasNaOption === "Yes",
        },
      });

      imported++;
    }

    // Audit log
    await logAudit({
      userId,
      role: userRole,
      action: "imported_skills_data",
      entityType: "skill",
    });

    return NextResponse.json({
      imported,
      skipped,
      skippedReasons: skippedReasons.slice(0, 100), // Limit to first 100
    });
  } catch (error) {
    console.error("[IMPORT_SKILLS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to import skills data" },
      { status: 500 }
    );
  }
}
