# Task 2-a: Skills Database Page Redesign

## Summary
Redesigned the Skills Database page at `/home/z/my-project/src/app/(superadmin)/superadmin/skills/page.tsx` to implement the new hierarchy: **Profession → Job Title → Specialty → Category → Skill Name**.

## Changes Made

### Left Panel (1/3 width):
- **Header**: "Job Titles" with + button and search input
- **Profession groups** shown as collapsible sections with colored dot indicators and chevron
- Each profession header shows: name, count of titles, count of specialties
- Profession-level actions: Rename (pencil), Delete (trash) on profession header
- **Job Titles** listed under each profession as clickable items
- Each job title shows: name, specialty count, skill count
- Active/selected job title highlighted with emerald bg and emerald left border
- Templates without job_title grouped under "General" 
- Job title actions: Rename (pencil), Delete (trash) on hover
- Smooth scroll for many professions/job titles

### Right Panel (2/3 width):
- **Header**: Shows "Profession > Job Title" breadcrumb with chevron
- **Subtitle**: "X specialties • Y skills"
- **Actions**: Rename, Delete, Add Specialty buttons
- **Specialties Section**: Selectable pills/chips with skill count badge, hover edit/delete
- **Skill Categories Section** (when specialty selected):
  - Header with specialty name, Preview and Add Skill buttons
  - Categories as collapsible groups with question type badges
  - Expanded shows skills table with sort order, name, type, N/A, and actions

### New Types:
- `JobTitleGroup`: Groups templates by job_title, with totalSkills count
- `ProfessionGroup`: Updated to contain `jobTitles` instead of `specialties`
- Added `PROFESSION_COLORS` map and `getProfessionColor()` for colored dots

### New State:
- `selectedJobTitle`: Tracks selected job title within a profession
- `expandedProfessions`: Set of expanded profession names in left panel
- `selectedProfession`, `selectedSpecialtyId`, `expandedCategories` preserved

### Preserved Functionality:
- All CRUD for templates (add/edit/delete)
- All CRUD for skills (add/edit/delete, sort order up/down)
- Import from xlsx with validation
- Export template / Export data
- Delete all with OTP verification
- Preview checklist modal (enhanced with rating scale legend)
- Rename profession dialog
- All dialog forms preserved and working

### Preview Modal Enhancement:
- Added Rating Scale Legend: 1=No Experience (red), 2=Minimal (yellow), 3=Competent (blue), 4=Expert (green)
- Rating skills now show visual 1-2-3-4 buttons instead of plain badge
- Template selector in skill dialog now shows "Profession › JobTitle — Specialty" format

## Files Modified
- `/home/z/my-project/src/app/(superadmin)/superadmin/skills/page.tsx` — Complete rewrite (1833 lines)

## Lint Status
- 0 errors, 1 warning (unrelated to this file, in `src/lib/zai.ts`)
