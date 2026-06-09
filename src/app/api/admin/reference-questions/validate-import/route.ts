import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_EMPLOYMENT_STATUSES = ["current", "ending_contract", "past"];
const VALID_RESPONSE_TYPES = ["rating_1_4", "yes_no", "text"];

interface ValidationError {
  row: number;
  message: string;
}

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

    const errors: ValidationError[] = [];
    const validRows: ValidRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row || row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "")) {
        continue;
      }

      const employmentStatus = String(row[0] ?? "").trim().toLowerCase();
      const questionText = String(row[1] ?? "").trim();
      const responseType = String(row[2] ?? "").trim();
      const sortOrderRaw = String(row[3] ?? "0").trim();

      const rowErrors: string[] = [];

      if (!employmentStatus) {
        rowErrors.push("Employment Status is required");
      } else if (!VALID_EMPLOYMENT_STATUSES.includes(employmentStatus)) {
        rowErrors.push(
          `Invalid Employment Status: "${employmentStatus}". Must be: current, ending_contract, or past`
        );
      }

      if (!questionText) {
        rowErrors.push("Question Text is required");
      }

      if (responseType && !VALID_RESPONSE_TYPES.includes(responseType)) {
        rowErrors.push(
          `Invalid Response Type: "${responseType}". Must be: rating_1_4, yes_no, or text`
        );
      }

      const sortOrder = parseInt(sortOrderRaw) || 0;

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, message: rowErrors.join("; ") });
      } else {
        validRows.push({
          employmentStatus,
          questionText,
          responseType: responseType || "rating_1_4",
          sortOrder,
        });
      }
    }

    return NextResponse.json({
      totalRows: rows.length - 1,
      validRows: validRows.length,
      errorRows: errors.length,
      errors,
      preview: validRows.slice(0, 5),
    });
  } catch (error) {
    console.error("[VALIDATE_REF_QUESTIONS_IMPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to validate import file" },
      { status: 500 }
    );
  }
}
