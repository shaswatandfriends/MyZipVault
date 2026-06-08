import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_QUESTION_TYPES = ["rating_1_4", "yes_no", "text"];
const VALID_NA_OPTIONS = ["yes", "no"];

interface ValidationError {
  row: number;
  message: string;
}

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

    // Read "Skills Data" sheet
    const wsName = wb.SheetNames.includes("Skills Data") ? "Skills Data" : wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    if (!ws) {
      return NextResponse.json({ error: "Could not find Skills Data sheet" }, { status: 400 });
    }

    const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Skip header row, validate each data row
    const errors: ValidationError[] = [];
    const validRows: ValidRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1; // 1-based for display

      // Skip completely empty rows
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

      const rowErrors: string[] = [];

      if (!profession) rowErrors.push("Profession is required");
      if (!jobTitle) rowErrors.push("Job Title is required");
      if (!specialty) rowErrors.push("Specialty is required");
      if (!category) rowErrors.push("Category is required");
      if (!skillName) rowErrors.push("Skill Name is required");

      if (questionType && !VALID_QUESTION_TYPES.includes(questionType)) {
        rowErrors.push(`Invalid Question Type: "${questionType}". Must be one of: ${VALID_QUESTION_TYPES.join(", ")}`);
      }

      if (hasNaOption && !VALID_NA_OPTIONS.includes(hasNaOption.toLowerCase())) {
        rowErrors.push(`Invalid Has N/A Option: "${hasNaOption}". Must be Yes or No`);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, message: rowErrors.join("; ") });
      } else {
        validRows.push({
          profession,
          jobTitle,
          specialty,
          category,
          skillName,
          questionType: questionType || "rating_1_4",
          hasNaOption: hasNaOption || "No",
        });
      }
    }

    return NextResponse.json({
      totalRows: rows.length - 1, // exclude header
      validRows: validRows.length,
      errorRows: errors.length,
      errors,
      preview: validRows.slice(0, 5),
    });
  } catch (error) {
    console.error("[VALIDATE_IMPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to validate import file" },
      { status: 500 }
    );
  }
}
