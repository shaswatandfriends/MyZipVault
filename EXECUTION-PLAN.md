# MyZipVault — Combined Execution Plan
Last updated: 2026-09-11
Status: Planning complete, ready to execute

This file merges:
1. The original 7-item improvement backlog (from 2026-09-11 planning session)
2. The IronBase-inspired feature review (post-evaluation)
3. Final decisions on each item after Q&A with Shaswat

Items are grouped into execution phases. Each phase is independently shippable.

---

## ✅ Final decisions summary

### IronBase-inspired features

| # | Feature | Decision | Notes |
|---|---------|----------|-------|
| 1 | Split-fee collaboration | ❌ SKIP | All recruiters already see all jobs; recruiters can't post jobs. No use case. |
| 2 | "My Work" quick-access sidebar | ✅ DO IT | Persistent left-nav with 4 one-click shortcuts. |
| 3 | Confidential employer option | ❌ SKIP | No transparency — doesn't fit the platform. |
| 4a | Boolean Generator | ❌ SKIP | Candidate mapping is automatic via structured spreadsheet upload. |
| 4b | AI Outreach Writer | ✅ DO IT (modified) | Becomes the new "Invite Candidate" flow with Job ID auto-loader + 72-hr cooldown. See Phase 3. |
| 4c | Resume Formatter | ❌ SKIP | Not now. |
| 5 | Bonus jobs (incentive layer) | ✅ DO IT | 70% standard, 75% on urgent. Needs superadmin config for platform split %, bonus %, ownership %. |
| 6 | In-app messaging | ✅ DO IT (modified) | NOT for split-fee. For candidate ↔ recruiter chat after invite acceptance. Lives in "Connections" section. |
| 7 | Job categories beyond healthcare | ❌ SKIP | Healthcare specialization is the moat. |
| 8 | PDF converter tool | ❌ SKIP | Not now. |
| 9 | Referral program | ✅ ALREADY EXISTS | Just needs a sidebar link to surface it. |

### Original TODO items

| # | Item | Decision |
|---|------|----------|
| 1 | Skills checklist data work | Shaswat will do manually. Super Z stays available for UI/schema changes if needed. |
| 2a | Test login workflow | ✅ DONE — verified working (commits 09aecbc, 7eed54d) |
| 2b | Auto-share checklist on submit | ✅ READY TO SHIP — Phase 1 |
| 3 | Resume templates | ✅ 5 templates, superadmin-managed, candidate can swap template per version, Version 1 is default unless changed. See Phase 5. |
| 4 | Checklist UI redesign | ✅ Reference: healthcareskillschecklist.com/checklist/rn. New fields stored on candidate profile (permanent, editable). SSN encrypted at rest. See Phase 4. |
| 5 | Specialty → text input | ✅ READY TO SHIP — Phase 1 |
| 6 | Platform UI/UX overall | Deferred — Shaswat will pick top 3 worst pages later. |
| 7 | Onboarding demo | ✅ Both dashboards. Custom in-house if possible. Auto-start + "Take a tour" button. Dismissible + remembered. See Phase 6. |

---

## Execution phases

### Phase 1 — Ready-to-ship quick wins (Day 1, ~3 hours total)

These need no new infrastructure. Ship immediately.

#### 1.1 — Specialty → text input
- **File:** `src/app/(recruiter)/recruiter/send/page.tsx` (line 829)
- **Change:** Replace `<Select>` with `<Input>` so recruiters can type any specialty
- **Time:** 5 minutes

#### 1.2 — Auto-share checklist on submit
- **File:** `src/app/api/candidate/checklists/[id]/submit/route.ts`
- **Change:** On submit, automatically create a `ConsentShare` linking the candidate's response to the recruiter's checklist request, 30-day default expiry. Only auto-share if the checklist was REQUESTED by a recruiter (not self-initiated). Notify candidate that it was auto-shared (revoke from `/sharing`).
- **Time:** 15 minutes

#### 1.3 — "My Work" quick-access sidebar
- **File:** `src/components/layout/sidebar.tsx` (add new section)
- **Add 4 one-click shortcuts:**
  - My submittals (jobs I've submitted candidates to)
  - Received submittals (deferred until split-fee is added — skip for now)
  - Messages (deferred until in-app messaging is built — skip for now)
  - My placements (successfully placed candidates, all-time)
- **Note:** Only "My submittals" and "My placements" ship in Phase 1. Messages and Received submittals get added when their underlying features ship (Phase 3).
- **Time:** 3 hours (UI + 2 new API routes for submittals/placements counts)

---

### Phase 2 — Superadmin config foundation (Day 2, ~4 hours)

These config fields are prerequisites for Phase 3 (bonus jobs) and the broader commission system.

#### 2.1 — Add commission config to PlatformSetting
Add these settings (managed via superadmin UI at `/superadmin/settings`):
- `platform_split_percent` (default: 70) — recruiter's share of placement fee
- `bonus_percent` (default: 5) — extra % on urgent/bonus jobs
- `ownership_residual_percent` (default: 5) — when Recruiter A owns candidate, Recruiter B submits and gets offer, Recruiter A gets this %
- `ownership_exclusive_days` (default: 90) — exclusive ownership window
- `ownership_residual_days` (default: 180) — residual window after exclusive
- `invite_cooldown_hours` (default: 72) — recruiter can't re-invite same candidate within this window

#### 2.2 — Superadmin UI for commission config
- **File:** `src/app/(superadmin)/superadmin/settings/page.tsx`
- Add a new "Commission & Splits" section with form fields for each setting above
- Save via existing `/api/superadmin/settings` route
- **Time:** 2 hours

#### 2.3 — Add `is_bonus` + `bonus_amount` to JobPosting
- **Migration:** New SQL file `prisma/sql/2026-09-12-job-bonus-fields.sql`
- Add `is_bonus` boolean (default false) + `bonus_amount` decimal (nullable)
- Update Prisma schema
- **Time:** 1 hour (schema + migration + Prisma generate)

#### 2.4 — Bonus badge on job cards
- **File:** `src/app/(recruiter)/recruiter/jobs/page.tsx`
- Show "⚡ Bonus: +5% (75% total)" badge on bonus jobs
- **Time:** 1 hour

---

### Phase 3 — Recruiter invite flow redesign (Days 3-5, ~3 days)

This is the biggest new feature. Replaces the current "Send Request" primary action with a simpler "Invite Candidate" flow.

#### 3.1 — New "Invite Candidate" modal/page
- **Route:** `/recruiter/invite` (new page) + button in sidebar header
- **UI flow:**
  1. Recruiter clicks "Invite Candidate"
  2. Modal opens with fixed email template (subject + body)
  3. Recruiter enters candidate email (required) + name (optional — auto-fills if candidate exists)
  4. Recruiter enters Job ID in a "Job ID" field, clicks "Load"
  5. Platform fetches job title + description from that Job ID
  6. Job description auto-inserts into email body (below the greeting)
  7. Recruiter can edit email body, or change Job ID and reload
  8. Recruiter clicks "Send Invite"
  9. Platform enforces 72-hr cooldown (per candidate email)
  10. Email sent via Brevo using the redesigned HTML template
- **Files to create:**
  - `src/app/(recruiter)/recruiter/invite/page.tsx` (UI)
  - `src/app/api/recruiter/invite/route.ts` (POST — send invite)
  - `src/app/api/recruiter/invite/check-cooldown/route.ts` (GET — check 72-hr window)
  - `src/app/api/recruiter/jobs/[id]/brief/route.ts` (GET — fetch job title + description for the loader)
- **DB:** New `RecruiterInvite` table:
  - `id`, `recruiter_user_id`, `candidate_email`, `job_id` (nullable), `email_subject`, `email_body`, `status` (sent/accepted/denied/expired), `sent_at`, `accepted_at`, `denied_at`
  - Index on `(candidate_email, sent_at)` for cooldown check
- **Time:** 1.5 days

#### 3.2 — 72-hour cooldown enforcement
- On invite POST, query `RecruiterInvite` for the candidate's email within the last 72 hrs (configurable via `invite_cooldown_hours`)
- If found → return 429 with "You can re-invite this candidate in X hours"
- **Time:** 30 minutes (part of 3.1)

#### 3.3 — Candidate "Connections" section
- **Route:** `/connections` (new page in candidate area)
- Shows a list of accepted/pending invites from recruiters
- Each card: recruiter name, org, position title, sent date, status badge
- Click to open → see full email + job description + Accept/Deny buttons
- Accept → opens chat (Phase 3.4)
- Deny → records denial, but recruiter's data + job are captured for the candidate's future reference
- **Files:**
  - `src/app/(candidate)/connections/page.tsx`
  - `src/app/api/candidate/connections/route.ts` (GET — list invites)
  - `src/app/api/candidate/connections/[id]/accept/route.ts`
  - `src/app/api/candidate/connections/[id]/deny/route.ts`
- **Mandatory profile fields gate:** If candidate hasn't completed mandatory fields (first name, last name, email, phone, job title/discipline, specialty, city, state, zip code), prompt them to fill these before they can review the invite
- **Time:** 1 day

#### 3.4 — In-app messaging (candidate ↔ recruiter)
- **Route:** `/messages` (shared candidate + recruiter)
- Chat UI: message list + composer
- Messages scoped to a `RecruiterInvite` (so chat is tied to a specific job invitation)
- Real-time via polling (v1) — refresh every 10 seconds when chat is open
- WebSocket upgrade deferred to v2
- **DB:** New `Message` table:
  - `id`, `invite_id` (FK to RecruiterInvite), `sender_user_id`, `body`, `sent_at`, `read_at`
- **Files:**
  - `src/app/(candidate)/messages/[inviteId]/page.tsx`
  - `src/app/(recruiter)/recruiter/messages/[inviteId]/page.tsx`
  - `src/app/api/messages/[inviteId]/route.ts` (GET messages, POST new message)
  - `src/app/api/messages/[inviteId]/read/route.ts` (mark read)
- **Time:** 1.5 days

#### 3.5 — Update "My Work" sidebar (Phase 1.3 continuation)
- Add "Messages" shortcut now that messaging exists
- Badge count of unread messages
- **Time:** 30 minutes

---

### Phase 4 — Skills checklist UI redesign (Days 6-8, ~3 days)

Reference: https://healthcareskillschecklist.com/checklist/rn

#### 4.1 — Add candidate profile fields (with SSN encryption)
- **New columns on `CandidateProfile`:**
  - `ssn_encrypted` (text, AES-256 encrypted)
  - `city` (text)
  - `state` (text, 2-char)
  - `years_experience_total` (integer)
  - `years_experience_specialty` (integer)
  - `zip_code` (text, nullable)
- **Encryption:** Use `src/lib/encryption.ts` (already exists) — encrypt SSN before DB write, decrypt on read
- **Migration:** `prisma/sql/2026-09-15-candidate-profile-fields.sql`
- **Time:** 2 hours (schema + migration + Prisma generate + encryption wrapper)

#### 4.2 — Redesign checklist list page
- **Reference:** https://healthcareskillschecklist.com/checklist/rn (study the layout before coding)
- **File:** `src/app/(candidate)/checklists/page.tsx`
- **Layout:**
  - Header with candidate info (pre-filled by recruiter): Name, Email, Phone
  - Candidate-fillable section: SSN, City, State, Years of experience (total + specialty)
  - These fields auto-save to candidate profile on blur
  - Below: list of available checklists by profession, with progress bars
- **Time:** 4 hours

#### 4.3 — Redesign checklist filling UI
- **File:** `src/app/(candidate)/checklists/[id]/page.tsx`
- **Layout (study reference site first):**
  - Sticky progress bar at top (X of Y skills rated)
  - Skills grouped by category, collapsible sections
  - Rating UI: 1-4 scale (or N/A) with clear visual labels
  - "Mark all in this category as N/A" bulk action per category
  - Auto-save each rating on change (debounced)
  - Digital signature pad at the bottom
- **Time:** 1 day

#### 4.4 — Group response feature (deferred — needs Shaswat's manual categorization)
- Will be added once Shaswat completes the manual skill categorization (TODO #1)
- Schema: add `group_id` column to `Skill` table when ready
- **Time:** deferred

---

### Phase 5 — Resume templates (Days 9-11, ~3 days)

5 templates, superadmin-managed, candidate can swap template per version, Version 1 is default.

#### 5.1 — DB schema
- **New table:** `ResumeTemplate`
  - `id`, `name`, `description`, `layout_config` (JSON: fonts, colors, section order, spacing), `is_active`, `created_at`, `updated_at`, `updated_by`
- **New column on `Resume`:** `template_id` (FK to ResumeTemplate, nullable — defaults to template #1)
- **New column on `Resume`:** `is_default_version` (boolean, default false) — only one resume per candidate can be default
- **Migration:** `prisma/sql/2026-09-18-resume-templates.sql`
- **Time:** 2 hours

#### 5.2 — Superadmin UI for resume templates
- **Route:** `/superadmin/resume-templates`
- List view: all templates with name, description, active toggle
- Edit view: form to edit layout_config JSON (or a guided UI with dropdowns for fonts, color pickers, section reorder)
- 5 starter templates pre-seeded via SQL migration:
  - "Classic Professional" (Times New Roman, black/white, traditional)
  - "Modern Clean" (Inter, navy/gray, minimal)
  - "Healthcare Standard" (Calibri, blue accent, sections: Contact, Licenses, Experience, Education, Skills)
  - "Compact One-Pager" (Arial, dense layout, fits on 1 page)
  - "Executive" (Georgia, serif headings, elegant)
- **Files:**
  - `src/app/(superadmin)/superadmin/resume-templates/page.tsx`
  - `src/app/api/superadmin/resume-templates/route.ts` (GET, POST)
  - `src/app/api/superadmin/resume-templates/[id]/route.ts` (PUT, DELETE)
- **Time:** 1 day

#### 5.3 — Candidate resume page: template picker
- **File:** `src/app/(candidate)/vault/resume/page.tsx`
- For each resume version, show a "Template" dropdown (defaults to template #1)
- Candidate can swap template → re-renders preview instantly
- "Set as default" button per version (only one can be default)
- When recruiter requests resume → default version auto-shares
- **Time:** 1.5 days

#### 5.4 — Resume rendering engine update
- **File:** `src/lib/resume-renderer.ts` (new file)
- Takes a `Resume` record + `ResumeTemplate` config → outputs HTML/PDF
- Supports: font family, font size, color, section order, spacing
- **Time:** 1 day

---

### Phase 6 — Onboarding demo walkthrough (Days 12-14, ~3 days)

Both candidate + recruiter dashboards. Custom in-house. Auto-start + button. Dismissible + remembered.

#### 6.1 — Build custom tour component
- **New file:** `src/components/onboarding/tour.tsx`
- Features:
  - Overlay with highlighted target element
  - Tooltip card with: title, description, "Next" / "Previous" / "Skip" buttons
  - Progress dots (1 of N)
  - Animations: fade in/out, highlight pulse
  - Responsive: works on mobile (bottom sheet) and desktop (side card)
- No external library — pure React + Tailwind
- **Time:** 1 day

#### 6.2 — Define tour steps for candidate dashboard
- **File:** `src/components/onboarding/tours/candidate-dashboard.ts`
- Steps (10-12):
  1. Welcome — "This is your dashboard. Let's take a quick tour."
  2. Profile completion — "Complete your profile to unlock all features."
  3. Resume vault — "Upload or build your resume here."
  4. Credentials — "Upload BLS, ACLS, licenses — we track expiries for you."
  5. References — "Request professional references from past employers."
  6. Skills checklists — "Complete once, share with any recruiter, forever."
  7. VaultSign — "Sign RTRs and offers electronically."
  8. Sharing — "Control who sees your data and for how long."
  9. Connections — "Recruiter invitations and messages appear here."
  10. Calendar — "Share availability with recruiters."
  11. Jobs — "Browse open positions and apply."
  12. Finish — "You're all set. Click 'Take a tour' anytime to replay."
- **Time:** 4 hours

#### 6.3 — Define tour steps for recruiter dashboard
- **File:** `src/components/onboarding/tours/recruiter-dashboard.ts`
- Steps (10-12):
  1. Welcome — "This is your recruiter workspace."
  2. Stats — "Track your pipeline at a glance."
  3. Send request — "Send checklist + document requests to candidates."
  4. Invite candidate — "Reach out to a candidate about a specific job."
  5. Candidate search — "Browse the 1M+ healthcare pool."
  6. BOB — "Track leads through your pipeline."
  7. Jobs — "Browse open jobs and submit candidates."
  8. VaultSign — "Send RTRs and offers for signature."
  9. Billing — "Buy credits and view invoices."
  10. BAA — "Sign your Business Associate Agreement."
  11. Team — "Invite colleagues to your organization."
  12. Finish — "You're all set. Click 'Take a tour' anytime to replay."
- **Time:** 4 hours

#### 6.4 — Persist "tour completed" flag
- **New column on `User`:** `onboarding_tour_completed_at` (timestamp, nullable)
- When tour completes or is skipped → set timestamp
- Auto-start tour only if `onboarding_tour_completed_at` is null
- "Take a tour" button in sidebar header → re-runs tour (ignores the flag)
- **Migration:** `prisma/sql/2026-09-22-onboarding-tour-flag.sql`
- **Time:** 1 hour

#### 6.5 — "Take a tour" button in UI
- **File:** `src/components/layout/sidebar.tsx`
- Add a "Take a tour" button with a compass/map icon, above the user menu
- Click → triggers tour for current dashboard
- **Time:** 1 hour

---

## Total time estimate

| Phase | Days | Cumulative |
|-------|------|------------|
| Phase 1 — Quick wins | 0.4 | 0.4 |
| Phase 2 — Superadmin config | 0.5 | 0.9 |
| Phase 3 — Invite flow + messaging | 3.0 | 3.9 |
| Phase 4 — Checklist UI redesign | 2.5 | 6.4 |
| Phase 5 — Resume templates | 3.0 | 9.4 |
| Phase 6 — Onboarding demo | 2.5 | 11.9 |

**Total: ~12 working days** (can be compressed if Shaswat provides rapid feedback)

---

## Dependencies & critical path

```
Phase 1 (quick wins) ─┐
                       ├─→ Phase 3 (invite flow) ──→ Phase 6 (demo)
Phase 2 (config) ──────┘                                  ↑
                                                         │
Phase 4 (checklist UI) ─────────────────────────────────┘
                                                         │
Phase 5 (resume templates) ─────────────────────────────┘
```

- Phase 3 depends on Phase 2 (needs `invite_cooldown_hours` config)
- Phase 6 depends on Phases 3, 4, 5 (tour steps reference features that must exist first)
- Phases 4 and 5 are independent — can run in parallel if needed

---

## What I need from Shaswat to start

**Nothing for Phase 1** — say "start Phase 1" and I ship immediately.

**For Phase 2:** Just confirmation that the 5 config fields are correct (platform_split_percent, bonus_percent, ownership_residual_percent, ownership_exclusive_days, ownership_residual_days, invite_cooldown_hours).

**For Phase 3:** Nothing — design is locked. The reference site (healthcareskillschecklist.com/checklist/rn) is only for Phase 4.

**For Phase 4:** I'll fetch and study https://healthcareskillschecklist.com/checklist/rn before starting. If there's a specific aspect of that site you want me to emulate (or avoid), let me know.

**For Phase 5:** Nothing — 5 templates, superadmin-managed, design locked.

**For Phase 6:** Nothing — custom in-house, both dashboards, auto-start + button, dismissible.

---

## How to start

Just say: **"start Phase 1"** and I'll ship all 3 quick wins (specialty input, auto-share on submit, My Work sidebar) in one commit.

For subsequent phases, say: **"start Phase 2"**, **"start Phase 3"**, etc.

If you want to reorder (e.g., start with Phase 5 resume templates first), just say so.
