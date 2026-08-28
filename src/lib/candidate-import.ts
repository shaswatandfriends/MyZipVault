/**
 * Candidate import logic: validates rows, normalizes contact info,
 * checks for duplicates by email OR phone, and inserts new records.
 *
 * Behavior on duplicate (per user's spec):
 *   - Skip silently — don't modify the existing record
 *   - Count as "duplicate" in the summary
 *
 * Behavior on missing required fields:
 *   - "name" is required
 *   - At least one of (email OR phone) must be present
 *   - Other fields (city, state, job_title, specialty) are optional
 *
 * Each row creates:
 *   - 1 CandidateRecord (source='platform_pool')
 *   - 1 CandidateContactInfo for email (if present)
 *   - 1 CandidateContactInfo for phone (if present)
 *
 * All inserts are batched in a transaction per chunk (default 500 rows).
 */

import { db } from "@/lib/db";
import { normalizeEmail, normalizePhone, formatPhoneDisplay } from "@/lib/phone-normalize";
import { splitName } from "@/lib/csv-parser";

// ─── Types ─────────────────────────────────────────────────────────────
export interface CandidateImportRow {
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  job_title?: string;
  specialty?: string;
  profession?: string;
  years_of_experience?: number;
  license_number?: string;
  license_state?: string;
  npi_number?: string;
}

export interface ImportSummary {
  totalRows: number;
  inserted: number;
  duplicates: number;
  errors: number;
  errorDetails: { row: number; message: string; raw: string }[];
}

// ─── Validate + normalize a single row ──────────────────────────────────
interface ValidationResult {
  ok: boolean;
  error?: string;
  normalized: {
    firstName: string;
    lastName: string;
    email: string | null;
    emailDisplay: string | null;
    phone: string | null;
    phoneDisplay: string | null;
    city: string | null;
    state: string | null;
    job_title: string | null;
    specialty: string | null;
    profession: string | null;
    years_of_experience: number | null;
    license_number: string | null;
    license_state: string | null;
    npi_number: string | null;
  } | null;
}

function validateAndNormalizeRow(row: CandidateImportRow): ValidationResult {
  // Required: name + (email OR phone)
  const fullName = (row.name ?? "").trim();
  if (!fullName) {
    return { ok: false, error: "Name is required", normalized: null };
  }

  const email = (row.email ?? "").trim();
  const phone = (row.phone ?? "").trim();
  if (!email && !phone) {
    return { ok: false, error: "At least email OR phone is required", normalized: null };
  }

  // Normalize contact info
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  // If email was provided but normalization failed, it's invalid
  if (email && !normalizedEmail) {
    return { ok: false, error: `Invalid email format: "${email}"`, normalized: null };
  }
  if (phone && !normalizedPhone) {
    return { ok: false, error: `Invalid phone format: "${phone}" (expected US format)`, normalized: null };
  }

  const { firstName, lastName } = splitName(fullName);

  return {
    ok: true,
    normalized: {
      firstName,
      lastName,
      email: normalizedEmail,
      emailDisplay: email.toLowerCase(),
      phone: normalizedPhone,
      phoneDisplay: phone ? formatPhoneDisplay(normalizedPhone) : null,
      city: (row.city ?? "").trim() || null,
      state: (row.state ?? "").trim().toUpperCase() || null,
      job_title: (row.job_title ?? "").trim() || null,
      specialty: (row.specialty ?? "").trim() || null,
      profession: (row.profession ?? "").trim() || null,
      years_of_experience: row.years_of_experience && !isNaN(Number(row.years_of_experience))
        ? Number(row.years_of_experience)
        : null,
      license_number: (row.license_number ?? "").trim() || null,
      license_state: (row.license_state ?? "").trim().toUpperCase() || null,
      npi_number: (row.npi_number ?? "").trim() || null,
    },
  };
}

// ─── Batch insert with dedup check ──────────────────────────────────────
/**
 * Inserts a batch of candidate rows. For each row:
 *   1. Validates + normalizes
 *   2. Checks if any existing CandidateContactInfo matches the normalized email OR phone
 *   3. If match found → skip as duplicate
 *   4. If no match → create CandidateRecord + CandidateContactInfo entries
 *
 * All inserts in this batch are wrapped in a transaction. If any one
 * insert fails (other than dedup-skips), the whole batch rolls back.
 *
 * @param rows - Array of candidate rows to import
 * @param batchStartRow - The original CSV row number where this batch starts (for error reporting)
 * @returns ImportSummary for this batch
 */
export async function importCandidateBatch(
  rows: CandidateImportRow[],
  batchStartRow: number = 1
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    totalRows: rows.length,
    inserted: 0,
    duplicates: 0,
    errors: 0,
    errorDetails: [],
  };

  // Step 1: Validate + normalize all rows
  const validRows: { original: CandidateImportRow; normalized: NonNullable<ValidationResult["normalized"]>; rowIdx: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIdx = batchStartRow + i;
    const validation = validateAndNormalizeRow(row);

    if (!validation.ok || !validation.normalized) {
      summary.errors++;
      summary.errorDetails.push({
        row: rowIdx,
        message: validation.error ?? "Unknown validation error",
        raw: JSON.stringify(row).substring(0, 200),
      });
      continue;
    }

    validRows.push({ original: row, normalized: validation.normalized, rowIdx });
  }

  if (validRows.length === 0) {
    return summary;
  }

  // Step 2: Bulk dedup check — query existing CandidateContactInfo by normalized email OR phone
  const allEmails = validRows
    .map((r) => r.normalized.email)
    .filter((e): e is string => e !== null);
  const allPhones = validRows
    .map((r) => r.normalized.phone)
    .filter((p): p is string => p !== null);

  const existingContacts = await db.candidateContactInfo.findMany({
    where: {
      deleted_at: null,
      OR: [
        ...(allEmails.length > 0 ? [{ type: "email", value_normalized: { in: allEmails } }] : []),
        ...(allPhones.length > 0 ? [{ type: "phone", value_normalized: { in: allPhones } }] : []),
      ],
    },
    select: { type: true, value_normalized: true, candidate_record_id: true },
  });

  // Build a set of existing (type + value) for fast lookup
  const existingKeySet = new Set<string>();
  for (const c of existingContacts) {
    existingKeySet.add(`${c.type}|${c.value_normalized}`);
  }

  // Step 3: Iterate rows, skip duplicates, batch-insert new ones
  // We use a transaction so the whole batch succeeds or fails together.
  try {
    await db.$transaction(async (tx) => {
      for (const { normalized, rowIdx } of validRows) {
        // Check if THIS row's email OR phone matches an existing record
        const emailKey = normalized.email ? `email|${normalized.email}` : null;
        const phoneKey = normalized.phone ? `phone|${normalized.phone}` : null;

        const isDuplicate =
          (emailKey !== null && existingKeySet.has(emailKey)) ||
          (phoneKey !== null && existingKeySet.has(phoneKey));

        if (isDuplicate) {
          summary.duplicates++;
          continue;
        }

        // Create the CandidateRecord
        const newRecord = await tx.candidateRecord.create({
          data: {
            first_name: normalized.firstName,
            last_name: normalized.lastName,
            city: normalized.city,
            state: normalized.state,
            job_title: normalized.job_title,
            specialty: normalized.specialty,
            profession: normalized.profession,
            years_of_experience: normalized.years_of_experience,
            license_number: normalized.license_number,
            license_state: normalized.license_state,
            npi_number: normalized.npi_number,
            source: "platform_pool",
          },
        });

        // Create CandidateContactInfo entries
        const contactInfoData: Array<{
          candidate_record_id: number;
          type: string;
          value: string;
          value_normalized: string;
          is_primary: boolean;
          added_by_candidate: boolean;
        }> = [];

        if (normalized.email) {
          contactInfoData.push({
            candidate_record_id: newRecord.id,
            type: "email",
            value: normalized.emailDisplay!,
            value_normalized: normalized.email,
            is_primary: true,
            added_by_candidate: false,
          });
        }

        if (normalized.phone) {
          contactInfoData.push({
            candidate_record_id: newRecord.id,
            type: "phone",
            value: normalized.phoneDisplay!,
            value_normalized: normalized.phone,
            is_primary: true,
            added_by_candidate: false,
          });
        }

        if (contactInfoData.length > 0) {
          await tx.candidateContactInfo.createMany({ data: contactInfoData });
        }

        // Add this row's contact info to the existing set so subsequent
        // rows in the SAME batch that match this row are also detected as
        // duplicates (handles intra-batch dupes)
        if (emailKey) existingKeySet.add(emailKey);
        if (phoneKey) existingKeySet.add(phoneKey);

        summary.inserted++;
      }
    });
  } catch (err) {
    // If the whole transaction failed, count all valid rows as errors
    const errMsg = err instanceof Error ? err.message : String(err);
    for (const { rowIdx } of validRows) {
      summary.errors++;
      summary.errorDetails.push({
        row: rowIdx,
        message: `Database insert failed: ${errMsg}`,
        raw: "",
      });
    }
    // Adjust counts since we didn't actually insert any
    summary.inserted = 0;
    summary.duplicates = 0;
  }

  return summary;
}

// ─── Merge two summaries ─────────────────────────────────────────────────
export function mergeSummaries(a: ImportSummary, b: ImportSummary): ImportSummary {
  return {
    totalRows: a.totalRows + b.totalRows,
    inserted: a.inserted + b.inserted,
    duplicates: a.duplicates + b.duplicates,
    errors: a.errors + b.errors,
    errorDetails: [...a.errorDetails, ...b.errorDetails],
  };
}
