# Task 9 + 15: Resume PDF Export & Manager Gets Free Candidate Vault

## Summary

Implemented two features for MyZipVault:

### Part A: Resume PDF Export (Task 9)

**Created:** `/home/z/my-project/src/app/api/candidate/resume/export-pdf/route.ts`
- GET handler requiring candidate role authentication
- Fetches candidate's resume from DB, parses the `parsed_data` JSON
- Maps resume data to `generateResumePdf()` format from `@/lib/pdf`
- Maps experience (facility/unit/dates → title/company/dates), education, skills (with proficiency), and certifications
- Returns PDF as downloadable response with proper headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="resume-{candidateName}.pdf"`

**Updated:** `/home/z/my-project/src/app/(candidate)/vault/resume/page.tsx`
- Replaced the placeholder `handleExportPdf` ("coming soon" toast) with a functional download handler
- Added `isExporting` state for loading feedback
- Handler fetches `/api/candidate/resume/export-pdf`, creates a blob URL, triggers download via programmatic link click
- Added "Export PDF" button to **both** the builder mode and view mode headers
- Buttons show spinner + "Exporting..." during the async operation

### Part B: Manager Gets Free Candidate Vault (Task 15)

**Updated:** `/home/z/my-project/src/app/api/reference/[id]/route.ts`
- After reference status is updated to "completed", added manager vault creation logic
- **If manager already has a user account:** Links `manager_user_id` on the candidate_reference record
- **If manager has no account:**
  1. Creates a new User with role "candidate", random temp password, `must_change_pass: true`
  2. Creates a CandidateProfile for the new user
  3. Links `manager_user_id` on the reference record
  4. Creates an InviteToken with `token_type: "manager_vault"` (30-day expiry) for password setup
  5. Sends welcome email via `sendEmail` with `manager_vault_welcome` template
- All vault creation logic is wrapped in try/catch so it never blocks the reference submission

## Files Modified/Created
- **Created:** `src/app/api/candidate/resume/export-pdf/route.ts`
- **Modified:** `src/app/(candidate)/vault/resume/page.tsx` (functional export button)
- **Modified:** `src/app/api/reference/[id]/route.ts` (manager vault logic)

## Lint Result
- 0 errors, 1 pre-existing warning (unrelated)
