# Task 6-7-9: Build Recruiter and Admin Pages for Skill Checklist System

## Agent: Main Agent

## Summary
Built all 3 pages for the Skill Checklist system as specified:

### Page 1: Recruiter Send Request Wizard (`/recruiter/send`)
- Complete 3-step wizard with step indicator (36px circles, connecting lines, Clash Display labels)
- Step 1 (Candidate Info): Grid layout with email check on blur, green/blue info boxes
- Step 2 (Select Checklist): Profession pills → Specialty pills → Checklist preview with categories; Document request section with 7 options; Credit summary with balance/remaining/insufficient warning
- Step 3 (Review & Send): Summary card, confirmation message, submit button with credit deduction

### Page 2: Recruiter Candidate Detail (`/recruiter/candidates/[id]`)
- Candidate header card with avatar, name, email/phone, status badge
- Checklist status card with gradient progress bar
- Activity timeline with milestone events
- Completed checklist results: Overall score box, per-category breakdown with color-coded rating badges
- Download PDF and Send Reminder buttons

### Page 3: Admin Content Manager (`/admin/content`)
- Tab 1: Split layout (300px left professions panel, right specialties panel)
- Tab 2: Skills Library with profession/specialty/category filters, type badges, sort reorder
- Tab 3: Reference Questions with employment status filter pills
- All dialogs use shadcn Dialog with RadioGroup where specified

### API Routes Created/Updated
- `/api/checklists/[id]/remind` — POST: Send reminder email with 24h cooldown
- `/api/checklists/[id]/pdf` — GET: Generate and download checklist PDF
- `/api/checklists/templates` — Updated: Added skillDetails query param for category preview

### Quality
- Lint: 0 errors
- All pages use "use client" directive
- CSS variables throughout (var(--primary), var(--surface), etc.)
- Toast from sonner
- shadcn/ui components
- Clash Display for headings, Inter for body
