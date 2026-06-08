# MyZipVault — Complete Feature Audit & Calendar Design Spec

> Last updated: 2026-06-08
> This file preserves the full feature list and calendar design so context is never lost across sessions.

---

## COMPLETE FEATURE AUDIT

### LANDING PAGE
| # | Feature | Status |
|---|---------|--------|
| 1 | Dual-view toggle: Healthcare Professionals / Staffing Agencies | ✅ Built |
| 2 | Animated hero sections with gradient text | ✅ Built |
| 3 | "How It Works" 3-step walkthrough | ✅ Built |
| 4 | Bento feature grid (4 cards each view) | ✅ Built |
| 5 | Privacy/trust section | ✅ Built |
| 6 | CTA buttons routing to signup | ✅ Built |
| 7 | Footer with About, Privacy, Terms, Contact links | ✅ Built |

### AUTHENTICATION
| # | Feature | Status |
|---|---------|--------|
| 1 | Candidate login (email/password) | ✅ Built |
| 2 | Candidate signup with password strength checker | ✅ Built |
| 3 | Agency signup (Staffing Agency / Individual Recruiter toggle) | ✅ Built |
| 4 | Agency signup → pending approval flow | ✅ Built |
| 5 | Invite-based onboarding (token-based) | ✅ Built |
| 6 | Admin login (role-gated) | ✅ Built |
| 7 | Agency login (role + approval gated) | ✅ Built |
| 8 | Superadmin OTP login (2-step: send code → verify) | ✅ Built |
| 9 | Superadmin TOTP setup (API exists) | ✅ API only |
| 10 | Forgot password | ❌ Stub only |
| 11 | TOS/Privacy links in signup forms | ❌ Non-functional |
| 12 | Social login (Google, etc.) | ❌ Not built |
| 13 | Email verification for candidates | ❌ Not built |

### CANDIDATE — DASHBOARD
| # | Feature | Status |
|---|---------|--------|
| 1 | Welcome message with profile name | ✅ Built |
| 2 | Thank you banner (post-checklist submission) | ✅ Built |
| 3 | Notification banner for pending checklists | ✅ Built |
| 4 | Profile completion progress bar | ✅ Built |
| 5 | 5 quick-status cards | ✅ Built |
| 6 | Recent activity feed | ✅ Built |
| 7 | Empty state for organic signups | ✅ Built |

### CANDIDATE — CHECKLISTS
| # | Feature | Status |
|---|---------|--------|
| 1 | Checklist listing with summary stats | ✅ Built |
| 2 | Checklist detail with 3 rating types | ✅ Built |
| 3 | Auto-save on each rating | ✅ Built |
| 4 | N/A toggle per skill | ✅ Built |
| 5 | Skills grouped by category | ✅ Built |
| 6 | Digital signature pad | ✅ Built |
| 7 | Submit checklist with attestation | ✅ Built |
| 8 | Thank-you page post submission | ✅ Built |

### CANDIDATE — CALENDAR (Current — Basic)
| # | Feature | Status |
|---|---------|--------|
| 1 | Monthly grid view with navigation | ✅ Built |
| 2 | Event dots (checklists, credentials, references) | ✅ Built |
| 3 | Selected date events panel | ✅ Built |
| 4 | Upcoming events (14 days) | ✅ Built |
| 5 | Quick stats (at a glance) | ✅ Built |
| 6 | Mark availability (working/free days, time slots) | ❌ Not built |
| 7 | Recurring availability templates | ❌ Not built |
| 8 | Block out dates / Quick override | ❌ Not built |
| 9 | Share calendar with recruiters | ❌ Not built |
| 10 | Generate shareable link with expiry | ❌ Not built |
| 11 | "Others Calendar" (see recruiter availability) | ❌ Not built |
| 12 | Availability status toggle | ❌ Not built |
| 13 | Minimum notice / shift duration preference | ❌ Not built |

### CANDIDATE — CREDENTIALS VAULT
| # | Feature | Status |
|---|---------|--------|
| 1 | Upload credential with file picker | ✅ Built |
| 2 | Document name + expiration date + reminder toggle | ✅ Built |
| 3 | Filter by status | ✅ Built |
| 4 | Status + verification badges | ✅ Built |
| 5 | Delete/edit credential | ❌ Not built |
| 6 | File preview or download | ❌ Not built |
| 7 | Credential detail page | ❌ Not built |

### CANDIDATE — RESUME BUILDER
| # | Feature | Status |
|---|---------|--------|
| 1 | Upload resume file | ✅ Built |
| 2 | AI-powered resume builder (6 tabs) | ✅ Built |
| 3 | Export as PDF | ✅ Built |
| 4 | Save, edit, delete resume | ✅ Built |
| 5 | Parsed data preview | ✅ Built |

### CANDIDATE — REFERENCES
| # | Feature | Status |
|---|---------|--------|
| 1 | Request reference dialog | ✅ Built |
| 2 | Reference listing with status badges | ✅ Built |
| 3 | Expand/collapse completed reference details | ✅ Built |
| 4 | Re-send / reminder for pending references | ❌ Not built |
| 5 | Cancel/delete reference request | ❌ Not built |

### CANDIDATE — SHARING & CONSENT
| # | Feature | Status |
|---|---------|--------|
| 1 | View pending share requests | ✅ Built |
| 2 | Per-item approve/deny | ✅ Built |
| 3 | Expiry selection (7/14/30 days) | ✅ Built |
| 4 | View active shares | ✅ Built |
| 5 | Revoke access on active shares | ❌ Not built |
| 6 | Modify expiry after approval | ❌ Not built |

### CANDIDATE — SETTINGS
| # | Feature | Status |
|---|---------|--------|
| 1 | Change password | ✅ Built |
| 2 | Delete account (30-day grace) | ✅ Built |
| 3 | Profile editing (name, phone) | ❌ Not built |
| 4 | Notification preferences | ❌ Not built |

### RECRUITER — DASHBOARD
| # | Feature | Status |
|---|---------|--------|
| 1 | Stats cards | ✅ Built |
| 2 | Credit balance badge | ✅ Built |
| 3 | Candidate table with search + compliance filter | ✅ Built |
| 4 | "Send New Request" button | ✅ Built |

### RECRUITER — SEND REQUEST
| # | Feature | Status |
|---|---------|--------|
| 1 | 4-step wizard | ✅ Built |
| 2 | Live email existence check | ✅ Built |
| 3 | Checklist template selection | ✅ Built |
| 4 | Document selection with credit preview | ✅ Built |
| 5 | Auto-creates candidate if new | ✅ Built |

### RECRUITER — BILLING
| # | Feature | Status |
|---|---------|--------|
| 1 | Credit balance display | ✅ Built |
| 2 | Credit packages for purchase | ✅ Built |
| 3 | Invoice list with PDF download | ✅ Built |
| 4 | Transaction history with filters | ✅ Built |
| 5 | Stripe integration for purchasing | ⚠️ API exists, UI shows "coming soon" |

### RECRUITER — BAA, TEAM, CANDIDATE DETAIL
All ✅ Built

### RECRUITER — CALENDAR + SCHEDULER (Full Design)
| # | Feature | Status |
|---|---------|--------|
| 1 | Tab 1: My Calendar (schedule view) | ❌ Not built |
| 2 | Tab 2: Candidates Calendar (shared calendars + filters) | ❌ Not built |
| 3 | Tab 3: Pipeline (Kanban board — 9 stages) | ❌ Not built |
| 4 | Tab 4: Leads List (table + filters) | ❌ Not built |
| 5 | Add New Lead | ❌ Not built |
| 6 | Schedule calls (specific date/time OR month range) | ❌ Not built |
| 7 | Call notification engine | ❌ Not built |
| 8 | Month-range daily reminders | ❌ Not built |
| 9 | Call outcome actions | ❌ Not built |
| 10 | Call history timeline per lead | ❌ Not built |
| 11 | Pipeline stages (9 stages) | ❌ Not built |
| 12 | Star rating (optional) | ❌ Not built |
| 13 | Auto-Match feature | ❌ Not built |
| 14 | Share recruiter availability | ❌ Not built |
| 15 | Drag & drop reschedule | ❌ Not built |
| 16 | Print/export daily call sheet | ❌ Not built |

### PLATFORM ADMIN
All ✅ Built except "View Profile" is a no-op

### SUPER ADMIN
| # | Feature | Status |
|---|---------|--------|
| 1-15 | Dashboard, Users, Companies, Admins, Settings, API Vault, Feature Flags, Templates, Analytics, Compliance, Errors, Reminders | ✅ Built |
| 16 | Calendar section | ❌ Not built |
| 17 | Company filter in Users page | ❌ Not built |
| 18 | Landing page editor persistence | ⚠️ No load-from-server |
| 19 | Announcement email campaigns | ⚠️ Placeholder |
| 20 | Proxy login session switch | ⚠️ Toast only |

### CROSS-CUTTING
| # | Feature | Status |
|---|---------|--------|
| 1-9 | Auth, email, SMS, file upload, audit, cron, stripe | ✅ Built |
| 10 | In-app notification bell (candidates only) | ✅ Built |
| 11 | Notification bell for recruiters | ❌ Not built |
| 12 | Notification action buttons | ❌ Not built |
| 13 | Credit gating per company with feature toggles | ❌ Not built |
| 14 | "Low credits, contact sales" popup | ❌ Not built |

---

## CALENDAR + SCHEDULER — COMPLETE DESIGN SPEC

### A. CANDIDATE CALENDAR

**My Calendar section:**
- Mark availability — working days vs free days, with time slots (e.g., "Lunch break 12–1 PM")
- Availability templates — "Morning Person" (6AM–2PM), "Night Owl" (10PM–6AM), "Weekends Only", "Flexible"
- Recurring availability — "Every Monday and Wednesday, 6 PM – 10 PM"
- Block out dates — vacation, sick days, personal days. Overrides recurring.
- Quick override — "Not available today" toggle, auto-reverts next day
- Minimum notice — "I need at least 24 hours notice before a shift"
- Shift duration preference — "8-hour" / "12-hour" / "4-hour minimum"
- Response deadline — "I respond to shift requests within 12 hours" (auto-expire if not)
- Availability status toggle — 🟢 Actively looking / 🟡 Open to opportunities / 🔴 Not available right now
- Preferred facilities — mark hospitals they prefer

**Sharing:**
- Direct share: Choose specific recruiters (only that recruiter + their admin can see)
- Link share: Generate shareable link with expiry (1 day / 1 month / 1 year / never)
  - Anyone with an account (agency/recruiter/candidate) can view just the calendar
  - Candidate managers: Free for shift scheduling
  - Recruiters/agencies: Only see calendar, everything else is paid
- Candidate can revoke access anytime

**Others Calendar section:**
- See recruiter's available time slots
- Request a call/meeting during those slots
- Filter by recruiter name, company, specialty
- Upcoming scheduled calls list
- Status of their shift requests (pending / accepted / declined)

### B. RECRUITER CALENDAR + SCHEDULER

**4 Tabs:**

**Tab 1: My Calendar**
- Day/Week/Month/Agenda view toggle
- Color-coded blocks: 🔵 Scheduled Call, 🟢 Shift Request (Accepted), 🟡 Pending Follow-up, 🟠 Month-range Reminder, 🔴 Overdue, ⚪ Not Interested
- Click block → slide-out panel with full lead details, call history, action buttons
- Share own availability with candidates

**Tab 2: Candidates Calendar**
- View shared candidate calendars
- Filters: Date range (single/multi-day), Search by name, Specialty/Skills, Availability status, Shift type, Previous interaction, Profile completion %, Certification active, Star rating
- Auto-Match: When recruiter creates a shift need, system auto-filters matching candidates

**Tab 3: Pipeline (Kanban Board)**
- 9 stages (manually moved by recruiter):
  1. New Lead
  2. Doc Pending
  3. Submitted
  4. Interested but no open job yet
  5. Interview Scheduled
  6. Offer Sent
  7. Onboarding
  8. Started
  9. Not Interested
- Drag leads across stages
- Each card shows: Name, Specialty, Last contact date, Next action, Pipeline stage

**Tab 4: Leads List**
- Table view with all leads
- Filters: Stage, Source, Date range, Specialty, Star rating
- Each row: Name, Email, Phone, Specialty, Stage, Last Contact, Next Action, Star Rating

**Add New Lead flow:**
After calling a candidate, recruiter adds:
- Name, Number, Email
- Job Title, Specialty
- Reached for (what position/role)
- Remark (how the call went)
- Source (Cold call / Referral / Job board / Walk-in / LinkedIn / Other)
- Schedule next: Specific date/time OR Month range (e.g., "December")

**Lead ownership:**
- Leads are private to the recruiter who created them
- Company admin can see ALL recruiters' leads (view-only)
- Admin can toggle reminders on/off but still sees data in reports
- Other recruiters in same company cannot see each other's leads
- Leads are separate from platform candidates (not auto-linked)

**Notification Engine (recruiter-only, candidate never sees these):**

| Trigger | Notification |
|----------|-------------|
| Day before scheduled call | "You have a call with [Name] tomorrow. Last note: [remark]" |
| Day of scheduled call | "Call [Name] today. Last discussion: [remark]" |
| 30 min after scheduled call time | "Did you reach [Name]?" → Called ✓ / Reschedule / Snooze 1hr |
| If rescheduled | New reminder cycle starts. Full history preserved |
| Month range selected (e.g., "Dec") | From Dec 1: "You planned to call [Name] this month. Pick a date." Daily until specific date picked |
| After picking specific date | Same cycle as specific date |
| Day after if no update | "You haven't updated [Name]'s call. Update now?" |
| "No Longer Interested" selected | Stops all notifications for that lead |

**Notification action buttons in dropdown:**
- Call reminders: Called ✓ → outcome form (Good/Reschedule/No Answer/Not Interested) | Reschedule → date/time picker | Snooze 1hr
- Shift requests (candidate): Accept | Decline | View Details

**Call outcome flow:**
After "Called ✓": Opens form with:
- How was it? Good / No Answer / Left Voicemail
- New remark (what was discussed)
- Schedule next: Specific date/time OR Month range OR No Longer Interested
- Full history of ALL past calls/notes preserved and visible

**Star Rating:** Optional 1-5 stars per lead after each interaction.

### C. SUPERADMIN CALENDAR SECTION

New sidebar item: "Calendar" in superadmin

Features:
- View all calendar activities across the platform
- Filters: By Recruiter, By Candidate, By Agency, By Company, To/From Date
- When viewing recruiter list → click eye icon → see all that recruiter's call logs, follow-ups, leads
- Detailed tracking: who sent request, who requested, candidate details
- Summary stats: calls scheduled today, follow-ups pending, overdue calls, active leads this week
- Recruiter performance: calls made, average follow-up time, conversion rate
- Company comparison: which company's recruiters are most active
- Export reports (CSV/PDF) with filters applied

### D. COMPANY ADMIN VIEW

- View-only access to all recruiters' leads and call history
- Can toggle own reminders on/off
- Still sees all data in reports
- No add/edit/delete capability on leads

### E. CREDIT GATING (Deferred)

- Per-company, superadmin toggles features on/off and assigns credits
- When recruiter/agency tries to access paid features → popup: "Low on credits. Contact sales person."
- Will discuss later

### F. NEW DATABASE MODELS NEEDED

- CalendarAvailability — Candidate's available slots (day, time range, working/free, recurring)
- CalendarShare — Who has access to candidate's calendar (direct share + link shares with expiry)
- RecruiterLead — Recruiter's lead entry (name, number, email, job title, specialty, reached for, remark, source)
- CallSchedule — Scheduled calls (specific date/time OR month range, linked to lead)
- CallLog — History of each call (date, time, outcome, remark, reschedule info)
- FollowUpReminder — Pending reminders with type
- ShiftRequest — Shift/interview requests from recruiters to candidates
- RecruiterAvailability — Recruiter's own available times
- PipelineStage — Lead's current pipeline stage with timestamps

### G. PIPELINE STAGES (Manual, in order)
1. New Lead
2. Doc Pending
3. Submitted
4. Interested but no open job yet
5. Interview Scheduled
6. Offer Sent
7. Onboarding
8. Started
9. Not Interested

### H. NOT BUILDING NOW
- Credits system per company with feature toggles
- Sales/CRM section in superadmin
- Dark mode
- Google Calendar / Outlook sync
