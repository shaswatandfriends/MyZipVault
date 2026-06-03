# Task: Send Request Page Implementation

## Agent: Main Agent
## Task ID: send-request-page

## Summary
Implemented a full multi-step form wizard for the Send Request page in MyZipVault, replacing the placeholder page.

## Files Created/Modified
1. **Created**: `src/app/api/recruiter/check-email/route.ts` - API route for debounced email existence check
2. **Modified**: `src/app/(recruiter)/recruiter/send/page.tsx` - Full 4-step form wizard implementation

## Implementation Details

### Step 1 — Candidate Info
- First Name, Last Name, Email, Phone inputs with icon prefixes
- Job Title input and Specialty dropdown (populated from checklist templates or fallback list)
- Debounced email check (500ms) against `/api/recruiter/check-email`
- Shows info banners: existing candidate (amber), new candidate (emerald), non-candidate user (destructive)
- Validation requires first name, last name, and valid email

### Step 2 — Checklist Selection
- Fetches templates from `/api/checklists/templates` on step entry
- RadioGroup for single selection
- Each template shows name, profession, specialty, and skill count badges
- Loading skeletons while fetching
- Empty state with refresh button

### Step 3 — Document Selection
- Checkboxes for: Resume, BLS, ACLS, References, Other Credentials
- Each document shows "1 credit" badge
- Credit deduction preview at bottom showing total = 1 (checklist) + selected docs

### Step 4 — Review & Confirm
- Summary cards for candidate info, checklist, and documents
- Prominent credit deduction display with large number and emerald gradient background
- "Confirm & Send" button that POSTs to `/api/recruiter/send-request`

### Progress Indicator
- Step X of 4 text with progress bar
- Clickable step circles for navigating back to completed steps
- Current step highlighted in emerald, completed steps with checkmark

### Success State
- Shows "Request sent to [candidate name]!" with CheckCircle2 icon
- "Send Another Request" button to reset the form

### Additional Features
- Teal/emerald primary brand color throughout
- Responsive design (mobile-first with sm: breakpoints)
- Toast notifications for errors
- Loading states with Loader2 spinner
- Proper form validation at each step before allowing next
- Maps frontend document keys to API-expected values
