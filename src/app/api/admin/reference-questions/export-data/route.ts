import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

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

    const questions = await db.referenceQuestion.findMany({
      orderBy: [{ employment_status: "asc" }, { sort_order: "asc" }],
    });

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Reference Questions Data ──────────────────
    const headers = [
      "Employment Status",
      "Question Text",
      "Response Type",
      "Sort Order",
    ];

    const dataRows: (string | number | undefined)[][] = questions.map((q) => [
      q.employment_status,
      q.question_text,
      q.response_type,
      q.sort_order,
    ]);

    const ws1Data = [headers, ...dataRows];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

    ws1["!cols"] = [
      { wch: 20 },
      { wch: 60 },
      { wch: 15 },
      { wch: 12 },
    ];

    // Style header row
    for (let col = 0; col < headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws1[cellRef]) {
        ws1[cellRef].s = {
          fill: { fgColor: { rgb: "166534" } },
          font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
          alignment: { horizontal: "center" },
        };
      }
    }

    // Alternate row shading
    for (let row = 1; row <= dataRows.length; row++) {
      for (let col = 0; col < headers.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws1[cellRef] && row % 2 === 0) {
          ws1[cellRef].s = {
            ...(ws1[cellRef].s || {}),
            fill: { fgColor: { rgb: "F3F4F6" } },
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws1, "Reference Questions");

    // ── Sheet 2: Instructions ─────────────────────────────
    const instructionsData = [
      ["MyZipVault Reference Questions Import Template"],
      ["Instructions:"],
      ["1. Do not change column headers in the Reference Questions sheet"],
      ["2. Employment Status must be one of: current, ending_contract, past"],
      ["3. Response Type must be one of: rating_1_4, yes_no, text"],
      ["4. Sort Order must be a number (determines display order)"],
      ["5. Do not leave Employment Status or Question Text blank"],
      ["6. Save file as .xlsx before uploading"],
      [""],
      ["Employment Status Values:"],
      ["current = Currently Working"],
      ["ending_contract = Ending Contract"],
      ["past = Past Employment"],
      [""],
      ["Rating Scale (for rating_1_4 type):"],
      ["1 = No theory and/or experience"],
      ["2 = Limited Experience"],
      ["3 = Experienced / minimal support needed"],
      ["4 = Proficient"],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(instructionsData);
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws2[titleCell]) {
      ws2[titleCell].s = {
        fill: { fgColor: { rgb: "166534" } },
        font: { color: { rgb: "FFFFFF" }, bold: true, sz: 14 },
      };
    }
    ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    ws2["!cols"] = [{ wch: 20 }, { wch: 60 }, { wch: 15 }, { wch: 12 }];

    XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const today = new Date().toISOString().split("T")[0];

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="MyZipVault_RefQuestions_Export_${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[REF_QUESTIONS_EXPORT_DATA_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
