# Skills Checklist Overhaul - Work Record

## Task Summary
Implemented a massive skills checklist overhaul with 10 steps covering frontend deletion, rating scale changes, database schema updates, Excel import/export, OTP-based deletion, preview functionality, and comprehensive UI updates.

## Changes Made

### Step 0 - Removed Candidate Checklist Frontend
- Deleted `/src/app/(candidate)/checklists/` folder (page.tsx, [id]/page.tsx, [id]/thank-you/page.tsx)
- Deleted `/src/app/api/checklists/` folder (route.ts, templates/route.ts, submit/route.ts, rate/route.ts)
- Deleted `/src/app/api/candidate/checklists/` folder ([id]/route.ts, [id]/submit/route.ts, [id]/rate/route.ts)
- Removed "Checklists" nav item from candidate sidebar

### Step 1 - Rating Scale Change (1-5 → 1-4)
- Changed all `rating_5` references to `rating_1_4` in admin content page
- Changed all `rating_3` references to `rating_1_4`
- Updated skill dialog question type options: "1-4 Rating", "Yes/No", "Text"
- Updated reference question dialog response type options similarly
- Updated default values for new skills/questions to "rating_1_4"

### Step 2 - job_title Field
- Added `job_title String?` to ChecklistTemplate model in Prisma schema
- Updated admin content API route to include job_title in select/mapping
- Updated checklist-templates API route to handle job_title
- Ran `prisma db push` successfully

### Step 3 - Export Template Endpoint
- Created `/src/app/api/admin/skills/export-template/route.ts`
- Generates Excel with "Skills Data" sheet (headers only) and "Instructions" sheet
- Uses xlsx package with green header styling (#166534)

### Step 4 - Export Current Data Endpoint
- Created `/src/app/api/admin/skills/export-data/route.ts`
- Same structure as template but populated with all existing skills
- Filename includes date: MyZipVault_Skills_Export_YYYY-MM-DD.xlsx

### Step 5 - Import Validation Endpoint
- Created `/src/app/api/admin/skills/validate-import/route.ts`
- Accepts multipart .xlsx file (max 10MB)
- Validates all required fields, question types, N/A options
- Returns totalRows, validRows, errorRows, errors, preview (first 5)

### Step 6 - Import Endpoint
- Created `/src/app/api/admin/skills/import/route.ts`
- Find-or-create ChecklistTemplate by profession + specialty
- Case-insensitive duplicate detection
- Auto-incrementing sort_order within categories
- Audit log entry created

### Step 7 - Delete All with OTP Endpoints
- Created `/src/app/api/admin/skills/request-delete-otp/route.ts`
  - Generates 6-digit OTP, bcrypt hash, stores in platform_settings
  - Sends via Brevo email
- Created `/src/app/api/admin/skills/delete-all/route.ts`
  - OTP verification with bcrypt.compare
  - 3 attempt limit, 10 minute expiry
  - Deletes skills, checklist_templates, reference_questions
  - Preserves candidate_checklist_responses, skill_ratings, etc.

### Step 8 - Preview Endpoints
- Created `/src/app/api/admin/skills/preview/[templateId]/route.ts`
  - Returns template with skills grouped by category
- Created `/src/app/api/admin/reference-questions/preview/route.ts`
  - Returns questions filtered by employment_status

### Step 9 - Admin Content Page UI Overhaul
- Added job_title field to template dialog and templates table
- Added 5 new buttons to Skills tab: Export Template, Import Data, Export Current Data, Delete All Data, Preview Checklist
- Import Modal with download template card, upload data card, warning box, validation results, import success
- Delete All Data Modal with 2-step flow (warning → OTP verification with 6 input boxes)
- Preview Checklist Modal (full-screen) with rating buttons, category grouping, signature section
- Reference Questions tab: added "Preview Form" button
- Reference Preview Modal with employment status tabs and rating buttons

### Additional Changes
- Added FileSpreadsheet icon to icons.ts
- Installed xlsx package
- All TypeScript errors resolved
- Lint passes (0 errors, 1 pre-existing warning)
