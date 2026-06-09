import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Reference Questions Data ──────────────────
    const headers = [
      "Employment Status",
      "Question Text",
      "Response Type",
      "Sort Order",
    ];

    const ws1Data: (string | undefined)[][] = [headers];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

    // Set column widths
    ws1["!cols"] = [
      { wch: 20 },  // Employment Status
      { wch: 60 },  // Question Text
      { wch: 15 },  // Response Type
      { wch: 12 },  // Sort Order
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
      [""],
      ["Example rows:"],
      ["current", "How would you rate this employee's clinical skills?", "rating_1_4", "1"],
      ["current", "Would you recommend this employee for rehire?", "yes_no", "2"],
      ["ending_contract", "Overall comments about performance:", "text", "1"],
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
    ws2["!cols"] = [
      { wch: 20 },
      { wch: 60 },
      { wch: 15 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="MyZipVault_RefQuestions_Import_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error("[REF_QUESTIONS_EXPORT_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
