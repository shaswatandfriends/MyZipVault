import { NextResponse } from "next/server";

/**
 * GET /api/superadmin/candidates/import-template
 *   Returns a sample CSV template with the expected columns + 2 example rows.
 *
 *   Columns: Name, Number, Email, City, State, Job Title, Specialty
 *   (column matching is flexible — handles "phone", "mobile", "specility" typos too)
 */
export async function GET() {
  const csvContent = `Name,Number,Email,City,State,Job Title,Specialty
Sarah Johnson,+1 (555) 123-4567,sarah.johnson@email.com,Austin,TX,Registered Nurse,ICU
David Martinez,+1 (555) 987-6543,david.m@email.com,Denver,CO,Travel Nurse,ER
Jane Smith,+1 (555) 555-1212,jane.smith@gmail.com,Seattle,WA,Nurse Practitioner,Family Medicine
`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="candidate-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
