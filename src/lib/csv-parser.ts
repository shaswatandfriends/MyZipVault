/**
 * CSV parser for the candidate import feature.
 *
 * Parses CSV text into an array of row objects. Uses a simple state machine
 * that handles quoted fields, escaped quotes, newlines inside quotes, and
 * trailing commas.
 *
 * For very large files (1M+ rows), this should be called on a stream rather
 * than the entire file in memory. For now, we read the whole file because
 * the API receives it in chunks of ~1000 rows.
 *
 * Column matching is flexible — handles case variations and common typos:
 *   "Name" / "name" / "Full Name" / "full_name" → name
 *   "Number" / "Phone" / "phone_number" / "mobile" → phone
 *   "Email" / "email_address" → email
 *   "City" → city
 *   "State" / "Region" → state
 *   "Job Title" / "JobTitle" / "jobtittle" / "title" → job_title
 *   "Specialty" / "Speciality" / "specility" / "specialization" → specialty
 */

// ─── Flexible column name matcher ──────────────────────────────────────
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "full name", "fullname", "full_name", "candidate name", "candidate"],
  phone: ["number", "phone", "phone number", "phone_number", "mobile", "mobile number", "cell", "contact", "contact number", "tel", "telephone"],
  email: ["email", "email address", "email_address", "e-mail", "e-mail address", "mail"],
  city: ["city", "town", "locality"],
  state: ["state", "region", "province", "st"],
  job_title: ["job title", "jobtitle", "jobtittle", "title", "role", "position", "designation", "job"],
  specialty: ["specialty", "speciality", "specility", "specialization", "specialization", "department", "field"],
  profession: ["profession", "professional area", "category", "domain"],
  years_of_experience: ["years of experience", "experience", "experience years", "yoe", "years"],
  license_number: ["license number", "license", "license_no", "lic no", "lic", "registration number"],
  license_state: ["license state", "lic state", "registered state"],
  npi_number: ["npi", "npi number", "npi_number", "national provider identifier"],
};

function normalizeColumnHeader(rawHeader: string): string | null {
  const cleaned = rawHeader.trim().toLowerCase().replace(/[\s_-]+/g, " ").replace(/\s+/g, " ").trim();

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(cleaned)) {
      return canonical;
    }
  }
  return null; // Unknown column — caller can decide what to do
}

// ─── CSV parser (state machine) ─────────────────────────────────────────
/**
 * Parses CSV text into an array of row objects keyed by canonical column name.
 *
 * Returns:
 *   - rows: array of { [canonicalColumn: string]: string }
 *   - headers: array of original header strings
 *   - unknownHeaders: array of headers that didn't match any canonical column
 *   - errors: array of { row: number, message: string } for malformed rows
 */
export interface CsvParseResult {
  rows: Record<string, string>[];
  headers: string[];
  canonicalHeaders: string[];
  unknownHeaders: string[];
  errors: { row: number; message: string }[];
  totalRows: number;
}

export function parseCsv(csvText: string): CsvParseResult {
  const result: CsvParseResult = {
    rows: [],
    headers: [],
    canonicalHeaders: [],
    unknownHeaders: [],
    errors: [],
    totalRows: 0,
  };

  // Strip BOM if present
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.substring(1);
  }

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Parse into rows of cells using a state machine
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (text[i + 1] === '"') {
          currentCell += '"';
          i += 2;
          continue;
        }
        // End of quoted section
        inQuotes = false;
        i++;
        continue;
      }
      currentCell += char;
      i++;
      continue;
    }

    // Not in quotes
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      i++;
      continue;
    }
    if (char === "\n") {
      currentRow.push(currentCell);
      currentCell = "";
      rows.push(currentRow);
      currentRow = [];
      i++;
      continue;
    }
    currentCell += char;
    i++;
  }

  // Push the last cell/row
  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    result.errors.push({ row: 0, message: "CSV is empty" });
    return result;
  }

  // First row = headers
  const rawHeaders = rows[0].map((h) => h.trim());
  result.headers = rawHeaders;

  const canonicalHeaders: (string | null)[] = rawHeaders.map(normalizeColumnHeader);
  result.canonicalHeaders = canonicalHeaders.map((h) => h ?? "");
  result.unknownHeaders = rawHeaders.filter((_, idx) => canonicalHeaders[idx] === null);

  // Subsequent rows = data
  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const cells = rows[rowIdx];

    // Skip empty rows (e.g., trailing blank line)
    if (cells.length === 1 && cells[0].trim() === "") {
      continue;
    }

    // Check for column count mismatch
    if (cells.length !== rawHeaders.length) {
      result.errors.push({
        row: rowIdx + 1,
        message: `Expected ${rawHeaders.length} columns, got ${cells.length}`,
      });
      // Still try to parse what we can
    }

    const rowObj: Record<string, string> = {};
    for (let colIdx = 0; colIdx < rawHeaders.length; colIdx++) {
      const canonical = canonicalHeaders[colIdx];
      if (!canonical) continue; // skip unknown columns
      const value = (cells[colIdx] ?? "").trim();
      rowObj[canonical] = value;
    }

    // Skip rows where all values are empty
    if (Object.values(rowObj).every((v) => v === "")) {
      continue;
    }

    result.rows.push(rowObj);
  }

  result.totalRows = result.rows.length;
  return result;
}

// ─── Helper: convert row to candidate record fields ────────────────────
/**
 * Splits a single "name" field into first_name + last_name.
 * - "John Doe" → first_name="John", last_name="Doe"
 * - "John" → first_name="John", last_name=""
 * - "John David Doe" → first_name="John", last_name="David Doe"
 * - "" → first_name="", last_name=""
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };

  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    return { firstName: trimmed, lastName: "" };
  }

  return {
    firstName: trimmed.substring(0, spaceIdx).trim(),
    lastName: trimmed.substring(spaceIdx + 1).trim(),
  };
}
