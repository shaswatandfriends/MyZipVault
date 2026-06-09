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

    // Fetch all skills with their template info
    const skills = await db.skill.findMany({
      include: {
        checklist_template: {
          select: {
            profession: true,
            specialty: true,
            name: true,
            job_title: true,
          },
        },
      },
      orderBy: [{ checklist_template_id: "asc" }, { sort_order: "asc" }],
    });

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Skills Data ──────────────────────────────
    const headers = [
      "Profession",
      "Job Title",
      "Specialty",
      "Category",
      "Skill Name",
      "Question Type",
      "Has N/A Option",
    ];

    const dataRows: (string | undefined)[][] = skills.map((s) => [
      s.checklist_template.profession,
      s.checklist_template.job_title || s.checklist_template.name.split(" - ")[0] || "",
      s.checklist_template.specialty,
      s.category,
      s.skill_name,
      s.question_type,
      s.has_na_option ? "Yes" : "No",
    ]);

    const ws1Data = [headers, ...dataRows];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

    // Set column widths
    ws1["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 50 },
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

    // Alternate row shading for data rows
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

    XLSX.utils.book_append_sheet(wb, ws1, "Skills Data");

    // ── Sheet 2: Instructions ─────────────────────────────
    const instructionsData = [
      ["MyZipVault Skills Checklist Import Template"],
      ["Instructions:"],
      ["1. Do not change column headers in the Skills Data sheet"],
      ["2. Profession must be one of: Nursing, Allied, Pharmacy, Locums"],
      ["3. Question Type must be one of: rating_1_4, yes_no, text"],
      ["4. Has N/A Option must be: Yes or No"],
      ["5. Do not leave Profession, Job Title, Specialty, Category, or Skill Name blank"],
      ["6. Save file as .xlsx before uploading"],
      [""],
      ["Rating Scale:"],
      ["1 = No theory and/or experience"],
      ["2 = Limited Experience"],
      ["3 = Experienced / minimal support needed"],
      ["4 = Proficient"],
      [""],
      ["Example rows:"],
      ["Nursing", "RN", "ICU", "Age of Patients Cared For", "Newborn/Neonate (birth to 30 days)", "rating_1_4", "No"],
      ["Nursing", "RN", "ICU", "General Skills", "Draw Blood Cultures", "rating_1_4", "No"],
      ["Nursing", "RN", "ICU", "Cardiac General Skills", "Interpretation of 12 lead EKG", "rating_1_4", "No"],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(instructionsData);

    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws2[titleCell]) {
      ws2[titleCell].s = {
        fill: { fgColor: { rgb: "166534" } },
        font: { color: { rgb: "FFFFFF" }, bold: true, sz: 14 },
      };
    }

    ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    ws2["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 50 },
      { wch: 15 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

    // Generate Excel file
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="MyZipVault_Skills_Export_${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[EXPORT_DATA_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
