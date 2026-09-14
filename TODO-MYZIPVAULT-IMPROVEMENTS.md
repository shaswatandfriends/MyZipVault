# MyZipVault — Improvement TODO List
Created: 2026-09-11
Owner: Shaswat + Super Z

This is a living TODO list of platform improvements. Update statuses as items ship.
Items marked ⏳ are blocked on inputs from Shaswat — see "Need from Shaswat" notes.

---

## ✅ Ready to ship now (no questions needed)

### #5 — Specialty field → text input (Quick fix)
- **File:** `src/app/(recruiter)/recruiter/send/page.tsx` (around line 829)
- **Change:** Replace the `<Select>` for specialty with an `<Input>` so recruiters can type any specialty instead of picking from a dropdown.
- **Why:** The dropdown is too restrictive. Recruiters need to type custom specialties (e.g., "Sleep Technologist - Sleep Medicine" or "Cath Lab RN").
- **Time:** ~5 minutes
- **Status:** ⏸ Pending "go" signal

### #2b — Auto-share checklist on submit (Critical UX fix)
- **File:** `src/app/api/candidate/checklists/[id]/submit/route.ts`
- **Current behavior:** When a candidate submits a checklist, the route only updates the response status to "submitted" and the request status to "completed". It does NOT create a ConsentShare record. The recruiter sees a "completed" status but cannot view the actual checklist response until the candidate manually goes to `/sharing` and approves sharing.
- **Recommended fix:** On submit, automatically create a `ConsentShare` record linking the candidate's response to the recruiter's checklist request, with a 30-day default expiry. Notify the candidate that it was auto-shared (and they can revoke from `/sharing`).
- **Exception:** Only auto-share if the checklist was REQUESTED by a recruiter (don't auto-share if candidate self-initiated).
- **Time:** ~15 minutes
- **Status:** ⏸ Pending "go" signal

---

## 🟡 Need clarification before starting

### #1 — Skills checklist data overhaul
**Sub-tasks:**
1. Template formatting — first draft
2. Template formatting — second draft (compare against 3 different sources to check for missing skills)
3. Add a "group response" feature in the skill section (Age population → rating 1-4 marks all skills in the group with the same response)
4. Manual cross-check of checklist question response types: Rating 1-4 / Yes-No / Text (categorize each skill's response type)

**Need from Shaswat:**
- 📎 The 3 source documents (PDFs/URLs) to compare skills against
- 📊 Current skill count per profession (Nursing / Allied Health / Physician / Non-Clinical / IT) — or grant me read access to the `Skill` table via Supabase
- ❓ How should "groups" be defined? Options:
  - A) Reuse existing `category` field (e.g., all "Patient Care" skills share a group)
  - B) Add a new `group_id` column to the `Skill` table (more flexible, allows sub-grouping)
  - C) Use the `Age Population` field from the checklist (e.g., "Neonatal", "Pediatric", "Adult", "Geriatric" — each is a group)
- ❓ Should the group rating (1-4) override individual skill ratings, or only fill in unrated skills?

**Time estimate:** 1-3 days (depends on skill count + source document complexity)
**Status:** ⏳ Blocked on inputs

---

### #3 — Resume section: multiple templates per candidate
**Goal:** Candidate can have multiple resume templates. They can choose which template each resume version uses. Up to 3 versions per resume. The "current" version is the default that gets shared with recruiters.

**Need from Shaswat:**
- ❓ How many resume templates to start with? (3? 5? 10?)
- ❓ Should templates be:
  - A) Hardcoded layouts in code (faster to ship, harder to edit)
  - B) Superadmin-managed via UI (slower to ship, easier to iterate)
- ❓ "3 versions" means:
  - A) 3 versions of the SAME template (same layout, different content)
  - B) 3 different templates, each with their own content (different layouts)
- ❓ When a recruiter requests a resume, should the candidate's "current" version auto-share, or should the candidate pick which version to share per request?
- ❓ Should the candidate be able to mark a different version as "current" later (one-click swap)?

**Time estimate:** 1-2 days
**Status:** ⏳ Blocked on inputs

---

### #4 — Skill checklist list + filling UI redesign
**Goal:** Redesign the checklist list page AND the checklist filling experience. Currently it looks bad — needs better UI/UX and proper placement of fields.

**Required candidate-fillable fields on the checklist (per the user's spec):**
- Name (pre-filled by recruiter)
- Email (pre-filled by recruiter)
- Phone number (pre-filled by recruiter)
- SSN (to be filled by candidate) — needs encryption at rest (HIPAA)
- City (to be filled by candidate)
- State (to be filled by candidate)
- Total years of experience (to be filled by candidate)
- Total years of experience in this specialty (to be filled by candidate)

**Need from Shaswat:**
- 📎 Reference design — screenshot or URL of a healthcare skills checklist UI you like (you mentioned "take an example from healthcare skill checklist" — which vendor? O'Grady Peyton? Medical Solutions? Trusted Nurse? FlexCare?)
- ❓ Should SSN / years-of-experience live:
  - A) On the candidate profile permanently (fill once, reuse across all checklists)
  - B) On the checklist response (per-request — candidate re-enters for each checklist)
  - C) Hybrid: pre-fill from profile, allow override per checklist
- ❓ Confirm: SSN should be encrypted at rest using AES-256? (HIPAA best practice)
- ❓ Should the redesigned checklist filling use a wizard (one category per step) or a single long page with sticky progress bar?

**Time estimate:** 2-3 hours after reference design is provided
**Status:** ⏳ Blocked on inputs

---

### #7 — Onboarding demo walkthrough
**Goal:** When a new account is created, show a step-by-step demo with [Next] buttons walking through each section. Each step has a small message explaining what the section is for.

**Need from Shaswat:**
- ❓ Which library:
  - A) `react-joyride` (most popular, ~5kb, well-documented)
  - B) `driver.js` (~10kb, lighter, modern look)
  - C) Custom in-house (full control, more dev time)
- ❓ Which pages need the tour?
  - Candidate dashboard only?
  - Recruiter dashboard only?
  - Both?
  - All pages?
- ❓ Trigger:
  - A) Auto-start on first login (dismissable with "Skip tour")
  - B) "Take a tour" button in the header (user-initiated)
  - C) Both (auto-start first time, button for replay)
- ❓ Should the tour remember "don't show again" per user? (localStorage or DB column)

**Time estimate:** 1-2 hours after library + scope is confirmed
**Status:** ⏳ Blocked on inputs

---

## 🟠 Too vague — needs scoping

### #6 — Platform UI/UX overall improvements
**Goal:** Improve overall platform UI/UX and user experience.

This is too broad to action without specifics. Need Shaswat to:
- 📎 Pick the top 3 pages that feel worst right now (screenshot them)
- ❓ What specifically feels off? (Loading speed? Layout? Colors? Information density? Mobile responsiveness?)
- ❓ Any reference sites you want to emulate? (e.g., "make it feel like Linear" or "make it feel like Notion")

**Time estimate:** TBD after scoping
**Status:** ⏳ Blocked on inputs

---

## ✅ Already done

### #2a — Test login workflow
**Status:** ✅ Verified working as of 2026-09-11

The full flow was tested end-to-end:
1. Recruiter sends checklist request to new candidate email
2. Candidate receives email with `/onboard?token=...` link
3. Candidate lands on `/onboard` page (NOT `/login`) — sees "Set up your account" form
4. Candidate enters password + confirms + accepts ToS
5. Click "Activate Account" → account is created (or pre-created candidate is upgraded) → auto-signin → redirect to candidate dashboard
6. Candidate sees pending checklist request on dashboard

**Fixes shipped for this flow:**
- `09aecbc` — duplicate email fix (was sending 2 emails per request)
- `09aecbc` — must_change_pass detection (existing users who never onboarded get `/onboard` link, not `/login`)
- `7eed54d` — onboard route now allows password setup for pre-created candidates (was returning 409)

---

## Suggested execution order

If you want to start shipping today, here's the order I'd do:

1. **#5 — Specialty → text input** (5 min, ship now) — say "go"
2. **#2b — Auto-share checklist on submit** (15 min, ship now) — say "go"
3. **#7 — Onboarding demo** (1-2 hours, big UX win) — pick library + 1 page to demo first
4. **#4 — Checklist list + filling UI** (2-3 hours) — need reference design first
5. **#1 — Skills data work** (1-3 days) — need the 3 source documents
6. **#3 — Resume templates** (1-2 days) — need template count + management model
7. **#6 — Platform UI/UX** — pick 3 pages to redesign first

---

## How to use this file

- **To start any item:** say "start #5" or "start #2b" — I'll ship immediately if it's ✅, or ask clarifying questions if it's ⏳.
- **To update status:** edit the Status line for that item (e.g., `Status: 🔄 In progress` or `Status: ✅ Shipped in commit abc123`).
- **To add a new item:** append to the appropriate section.
- **To archive completed items:** move to the "✅ Already done" section with commit hash.

This file is committed to the repo so it's version-controlled. Don't delete — just update statuses.
