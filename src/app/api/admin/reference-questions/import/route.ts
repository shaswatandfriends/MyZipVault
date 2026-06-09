import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_EMPLOYMENT_STATUSES = ["current", "ending_contract", "past"];
const VALID_RESPONSE_TYPES = ["rating_1_4", "yes_no", "text"];

interface ValidRow {
  employmentStatus: string;
  questionText: string;
  responseType: string;
  sortOrder: number;
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "buffer" });

    const wsName = wb.SheetNames.includes("Reference Questions")
      ? "Reference Questions"
      : wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    if (!ws) {
      return NextResponse.json(
        { error: "Could not find Reference Questions sheet" },
        { status: 400 }
      );
    }

    const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
    });

    const validRows: ValidRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "")) {
        continue;
      }

      const employmentStatus = String(row[0] ?? "").trim().toLowerCase();
      const questionText = String(row[1] ?? "").trim();
      const responseType = String(row[2] ?? "").trim();
      const sortOrderRaw = String(row[3] ?? "0").trim();

      if (!employmentStatus || !questionText) {
        continue;
      }

      if (!VALID_EMPLOYMENT_STATUSES.includes(employmentStatus)) {
        continue;
      }

      const normalizedRt = VALID_RESPONSE_TYPES.includes(responseType)
        ? responseType
        : "rating_1_4";

      validRows.push({
        employmentStatus,
        questionText,
        responseType: normalizedRt,
        sortOrder: parseInt(sortOrderRaw) || 0,
      });
    }

    // Import valid rows
    let imported = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    for (const row of validRows) {
      // Check if question already exists (case-insensitive on question text)
      const existing = await db.referenceQuestion.findFirst({
        where: {
          employment_status: row.employmentStatus,
          question_text: { mode: "insensitive", equals: row.questionText },
        },
      });

      if (existing) {
        skipped++;
        skippedReasons.push(
          `Duplicate: [${row.employmentStatus}] ${row.questionText.substring(0, 50)}`
        );
        continue;
      }

      await db.referenceQuestion.create({
        data: {
          employment_status: row.employmentStatus,
          question_text: row.questionText,
          response_type: row.responseType,
          sort_order: row.sortOrder,
        },
      });

      imported++;
    }

    // Audit log
    await logAudit({
      userId,
      role: userRole,
      action: "imported_reference_questions",
      entityType: "reference_question",
    });

    return NextResponse.json({
      imported,
      skipped,
      skippedReasons: skippedReasons.slice(0, 100),
    });
  } catch (error) {
    console.error("[IMPORT_REF_QUESTIONS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to import reference questions" },
      { status: 500 }
    );
  }
}
