import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv-parser";
import { importCandidateBatch, mergeSummaries, type ImportSummary, type CandidateImportRow } from "@/lib/candidate-import";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/superadmin/candidates/import-csv
 *
 * Imports a batch of candidate records from a CSV chunk. The frontend
 * splits the CSV into chunks of ~1000 rows and sends each chunk separately
 * to avoid the Vercel 60s serverless timeout.
 *
 * Request body (multipart/form-data):
 *   - file: CSV file chunk (UTF-8 text)
 *   - chunkIndex: number (0-based)
 *   - totalChunks: number
 *   - totalRows: number (total rows across all chunks)
 *
 * Response:
 *   {
 *     success: true,
 *     chunkIndex: number,
 *     summary: ImportSummary  // for this chunk only
 *   }
 *
 * Auth: super_admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file");
    const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
    const totalChunks = parseInt(formData.get("totalChunks") as string, 10);
    const totalRows = parseInt(formData.get("totalRows") as string, 10);

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: "chunkIndex and totalChunks are required" }, { status: 400 });
    }

    // Read file as text
    const csvText = await file.text();

    // Parse CSV
    const parseResult = parseCsv(csvText);

    if (parseResult.errors.length > 0 && parseResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        chunkIndex,
        error: `CSV parse failed: ${parseResult.errors[0].message}`,
        parseErrors: parseResult.errors.slice(0, 20),
      }, { status: 400 });
    }

    // Convert parsed rows to CandidateImportRow format
    const importRows: CandidateImportRow[] = parseResult.rows.map((row) => ({
      name: row.name ?? "",
      email: row.email,
      phone: row.phone,
      city: row.city,
      state: row.state,
      job_title: row.job_title,
      specialty: row.specialty,
      profession: row.profession,
      years_of_experience: row.years_of_experience ? parseInt(row.years_of_experience, 10) : undefined,
      license_number: row.license_number,
      license_state: row.license_state,
      npi_number: row.npi_number,
    }));

    // Process this chunk (batchStartRow is 1-indexed; chunk 0 starts at row 1, chunk 1 at row 1001, etc.)
    const BATCH_SIZE = 500; // inner batch size for transactions
    const batchStartRow = chunkIndex * 1000 + 1;

    let summary: ImportSummary = {
      totalRows: 0,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [],
    };

    // Process in inner batches of BATCH_SIZE
    for (let i = 0; i < importRows.length; i += BATCH_SIZE) {
      const innerBatch = importRows.slice(i, i + BATCH_SIZE);
      const innerStartRow = batchStartRow + i;
      const innerSummary = await importCandidateBatch(innerBatch, innerStartRow);
      summary = mergeSummaries(summary, innerSummary);
    }

    // Audit log: log every chunk (not just the last one)
    const adminUserId = parseInt(session.user.id as string, 10);
    try {
      await logAudit({
        userId: adminUserId,
        role: "super_admin",
        action: "candidate_csv_import_chunk",
        entityType: "candidate_record",
        entityId: chunkIndex,
        details: `Chunk ${chunkIndex + 1}/${totalChunks}: imported ${summary.inserted}, skipped ${summary.duplicates} duplicates, ${summary.errors} errors (total rows in CSV: ${totalRows})`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log CSV import chunk:", auditErr);
    }

    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      summary,
      unknownHeaders: parseResult.unknownHeaders,
    });
  } catch (error) {
    console.error("[CSV_IMPORT] Error:", error);
    return NextResponse.json(
      { error: "Failed to import CSV chunk", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
