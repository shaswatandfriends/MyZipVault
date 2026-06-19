# MyZipVault — Marketplace Expansion Specification
## Project Codename: "Marketplace Layer v1.0"

**Document Owner:** Shaswat Pandey (Founder)
**CTO Author:** Super Z
**Date Created:** June 17, 2026
**Target Build Start:** ~October 2026 (3-4 months from now)
**Estimated Build Duration:** 13 weeks (3 months) once started
**Current Platform Version:** v00.01.00 (shipped June 14, 2026)

---

## 📌 HOW TO USE THIS DOCUMENT

In 3-4 months, hand this document back to Super Z (or any engineer) and say:
**"Build Marketplace Layer v1.0 per this spec. Start with Phase 0 validation."**

This document is **frozen as of June 17, 2026**. It captures every decision, rule, edge case, and architectural choice we agreed on. The core spec should NOT change — only the validation findings (Phase 0) may adjust priorities.

---

## 🎯 EXECUTIVE SUMMARY

MyZipVault is currently a **tool** — credential verification SaaS for healthcare staffing. This spec evolves it into a **marketplace** — a candidate-recruiter matching platform where:

- **Candidates** control their discoverability and initiate engagements with recruiters
- **Recruiters** get a public professional profile (LinkedIn-style) and cannot search candidates
- **Engagements** are explicit, time-bound, and terminable by either side
- **Trust** is built through verified badges, reviews, and response-rate transparency
- **Data isolation** is enforced per-recruiter until candidate explicitly shares more

This is a **major product expansion**. Do NOT attempt without completing Phase 0 validation first (see below).

---

## 🛑 CRITICAL PRE-BUILD REQUIREMENT

### Phase 0 — Validation (4 weeks, BEFORE any building)

Before writing a single line of marketplace code, the following must be true:

1. **At least 10 real recruiters** actively using the platform (sending requests, unlocking documents)
2. **At least 30 real candidates** with completed profiles (resume + 1 credential + 1 checklist)
3. **At least 5 user interviews** completed (15 min each, mix of candidates and recruiters)
4. **At least 3 session recordings** reviewed (Hotjar, Vercel Analytics, or screen-share recordings)
5. **Vercel Analytics + PostHog (or similar)** installed and tracking key events
6. **Specific validation questions answered** (see Phase 0 section below)

### Why This Matters

Every feature in this spec is a **hypothesis** about what users want. Phase 0 proves or disproves those hypotheses BEFORE we spend 3 months building. If 8 of the 12 features turn out to be unnecessary, we save 2 months of engineering time.

**Do NOT skip Phase 0. Do NOT build features speculatively.**

---

## 🧱 CORE PRINCIPLES & RULES

These are the **non-negotiable rules** every feature must obey. Any feature that violates these rules must be redesigned.

### Rule 1: Candidate Sovereignty
The candidate is the gatekeeper of their own data and discoverability.
- Candidates decide who can see what
- Candidates can terminate any engagement at any time, no reason required
- Candidates can block any recruiter permanently
- Candidates control their availability visibility (3 levels: Public / Engaged Only / Private)

### Rule 2: Recruiter Information Isolation (Per-Recruiter, Per-Field)
**BEFORE engagement accepted:**
- Recruiter sees ONLY the fields they manually typed when creating the lead
- Even if candidate has a full profile elsewhere on the platform, recruiter has ZERO visibility into it
- If Recruiter A enters "Shaswat, shaswat@0047" → Recruiter A only ever sees name + email
- If Recruiter B enters "Shaswat, 6394880047" (different field) → Recruiter B only sees name + phone
- The two recruiters do NOT know about each other's leads

**AFTER candidate approves engagement:**
- Recruiter sees what the CANDIDATE chooses to share (resume, calendar, preferences, etc.)
- Sharing is explicit, per-document, with expiry dates (already built in `consent_shares` table)
- Recruiter does NOT automatically see "the full platform profile" — only what candidate shares

### Rule 3: No Candidate Search by Recruiters
Recruiters CANNOT search for candidates on the platform. They only get candidates via:
- Manual lead entry (name + email and/or phone)
- Skill checklist / credential request flow (already built)
- Candidate-initiated engagement requests (new)

This is a **legal and ethical firewall**. The platform is NOT a candidate database.

### Rule 4: One-Way Role Conversion
- Individual recruiter → Agency recruiter: ALLOWED (one-way, with warning)
- Agency recruiter → Individual recruiter: NEVER ALLOWED

Rationale: Once someone is an agency, their leads and candidate relationships become company assets. Rollback would create data ownership chaos.

### Rule 5: Pipeline Lock Within Company
If Recruiter A at Company X has a candidate in any pipeline stage EXCEPT "Not Interested," Recruiter B at Company X CANNOT engage that candidate.

Exception: Client Admin has a "Release to Pool" override (see Rule 7).

### Rule 6: Termination is Final (for now)
- Either side can terminate an engagement at any time
- Candidate termination: no reason required, recruiter cannot send more messages
- Recruiter termination: must select reason from preset list, candidate cannot send more messages
- Message history is retained for 60 days, then auto-deleted (compliance + audit window)
- After termination, candidate CAN re-engage same recruiter later (cooldown: 30 days)

### Rule 7: Client Admin Override Powers
Client Admin at an agency has these exclusive powers:
- View all recruiters' pipelines and candidate activity in their company
- "Release to Pool" — forcibly move a candidate out of an inactive recruiter's pipeline
  - Warning shown: "This will mark candidate as 'Not Interested' and you will lose their Interested/Interview/Offer tags"
  - Confirmation required with text input ("RELEASE" typed)
- "Reassign" — transfer candidate from Recruiter A to Recruiter B (same company)
  - No data loss, full audit trail preserved
- "Promote" — when a recruiter leaves, promote a replacement to take over that Book of Business
  - Replace email + password on the seat
  - New person inherits all leads, engagements, and pipeline history
  - Old person's access is revoked immediately

### Rule 8: Review Eligibility
Reviews can ONLY be left by users who had a **completed engagement** with the reviewed party.
- "Completed" = engagement status reached `completed` OR `terminated`
- Pending/active engagements cannot be reviewed
- One review per engagement (no editing, no deleting)
- Reviews are NOT anonymous (both parties see who left the review)

### Rule 9: Verified Recruiter Tiers (3 levels)
- **Basic**: Email verified, account >30 days old, no major complaints
- **Verified**: Basic + phone verified + admin manual review of identity
- **Premium**: Verified + 10+ positive reviews + active paid subscription (when Stripe is live)

Badge displayed on public profile. Tiers are awarded by Super Admin (manual for now).

### Rule 10: Same Calendar, Single Source of Truth
The candidate's availability calendar is the SAME calendar used in:
- The existing Calendar+Pipeline module (already built)
- The new marketplace engagement flow (new)
- Recruiter's view of candidate availability (new)

NO separate "marketplace calendar." NO duplicate availability. ONE source of truth.

---

## 👥 USER ROLES & ACCOUNT TYPES

### Existing Roles (already in platform)
- `candidate` — nurses, managers (free forever)
- `client_recruiter` — recruiter at an agency
- `client_admin` — admin at an agency (manages team, sees all)
- `platform_admin` — MyZipVault staff (verifies docs, manages users)
- `super_admin` — you (full god mode)

### New Account Type Distinction
Within `client_recruiter` and `client_admin` roles, add a new field:

```
recruiter_type: "individual" | "agency"
```

- **Individual recruiter**: No organization_id, operates solo, profile is personal
- **Agency recruiter**: Has organization_id, profile is nested under company page

### Conversion Rules
| From | To | Allowed? | Notes |
|---|---|---|---|
| Individual recruiter | Agency client_admin | ✅ YES (one-way) | Creates new Organization, becomes admin, leads migrate to org |
| Individual recruiter | Agency client_recruiter | ❌ NO | Must become admin of their own agency first |
| Agency client_admin | Individual recruiter | ❌ NEVER | Locked permanently |
| Agency client_recruiter | Individual recruiter | ❌ NEVER | Locked permanently |
| Agency client_recruiter | Agency client_admin (same org) | ✅ YES | Promoted by current admin |
| Agency client_admin | Agency client_recruiter (same org) | ✅ YES | Demoted by Super Admin only |

---

## 📊 DATA MODELS (Prisma Schema Additions)

All new tables are **additive** — no existing tables will be modified destructively. All use CamelCase naming (matching existing convention).

### New Model 1: `RecruiterProfile`
Public profile for recruiters (both individual and agency).

```prisma
model RecruiterProfile {
  id                    Int       @id @default(autoincrement())
  user_id               Int       @unique
  public_id             String    @unique @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profile_slug          String    @unique  // e.g., "jane-smith-rn-recruiter"
  headline              String?   // e.g., "ICU & Travel Nurse Recruiter"
  bio                   String?   // Long-form bio, max 2000 chars
  recruiter_type        String    @default("individual")  // "individual" | "agency"
  specialties           String    @default("[]")  // JSON array: ["ICU", "Med-Surg", "Travel"]
  states_of_operation   String    @default("[]")  // JSON array: ["CA", "NV", "AZ"]
  professions           String    @default("[]")  // JSON array: ["Nursing", "Allied", "Locums"]
  is_verified           String    @default("basic")  // "basic" | "verified" | "premium"
  verified_at           DateTime?
  verified_by           Int?      // User ID of admin who verified
  years_of_experience   Int?
  total_placements      Int       @default(0)  // Manually entered, not auto-counted
  response_rate_pct      Int       @default(0)  // Auto-calculated: % of requests responded to within 24hr
  avg_response_hours    Int?      // Auto-calculated: avg hours to first response
  is_accepting_engagements Boolean @default(true)  // Recruiter can pause inbound
  profile_views_count   Int       @default(0)
  created_at            DateTime  @default(now())
  updated_at            DateTime  @default(now())

  user                  User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  reviews_received      RecruiterReview[] @relation("RecruiterReviewsReceived")
  reviews_given         RecruiterReview[] @relation("RecruiterReviewsGiven")
  engagement_requests_received EngagementRequest[] @relation("EngagementRequestsReceived")
  engagement_requests_sent EngagementRequest[] @relation("EngagementRequestsSent")
  conversations         Conversation[] @relation("RecruiterConversations")

  @@index([recruiter_type])
  @@index([is_verified])
  @@index([is_accepting_engagements])
  @@index([profile_slug])
}
```

### New Model 2: `RecruiterReview`
Reviews left by candidates (or other recruiters) after completed/terminated engagements.

```prisma
model RecruiterReview {
  id                    Int       @id @default(autoincrement())
  recruiter_user_id     Int       // Who is being reviewed
  reviewer_user_id      Int       // Who left the review
  engagement_id         Int       // FK to EngagementRequest (must be completed or terminated)
  rating                Int       // 1-5 stars
  remark                String?   // Optional text, max 500 chars
  review_type           String    @default("candidate_to_recruiter")  // "candidate_to_recruiter" | "recruiter_to_candidate"
  is_visible            Boolean   @default(true)  // Admin can hide inappropriate reviews
  is_flagged            Boolean   @default(false)
  flagged_reason        String?
  flagged_at            DateTime?
  flagged_by            Int?
  created_at            DateTime  @default(now())

  recruiter             User      @relation("RecruiterReviewsReceived", fields: [recruiter_user_id], references: [id])
  reviewer              User      @relation("RecruiterReviewsGiven", fields: [reviewer_user_id], references: [id])
  engagement            EngagementRequest @relation(fields: [engagement_id], references: [id])

  @@unique([engagement_id, review_type])  // One review per engagement per direction
  @@index([recruiter_user_id, is_visible])
  @@index([reviewer_user_id])
}
```

### New Model 3: `EngagementRequest`
Candidate-initiated request to engage with a recruiter.

```prisma
model EngagementRequest {
  id                    Int       @id @default(autoincrement())
  candidate_user_id     Int
  recruiter_user_id     Int
  request_type          String    @default("connection")  // "connection" | "call" | "query"
  // Job preferences (from candidate's intent)
  job_title             String?   // e.g., "Registered Nurse"
  specialty             String?   // e.g., "ICU"
  employment_type       String?   // "contract" | "prn" | "permanent" | "travel"
  duration_weeks        Int?      // e.g., 13
  start_date            DateTime?
  end_date              DateTime?
  requested_time_off    String    @default("[]")  // JSON array of dates: ["2026-12-25", "2026-12-31"]
  // Message
  message               String?   // Max 1000 chars
  // Visibility preference
  verified_recruiters_only Boolean @default(false)  // Candidate filter at search time, stored here for audit
  // Status lifecycle
  status                String    @default("pending")
    // "pending" → "accepted" → "messaging" → "shift_offered" → "completed" → "review_pending" → "closed"
    // OR: "pending" → "declined" → "closed"
    // OR: any active state → "terminated_by_candidate" → "closed"
    // OR: any active state → "terminated_by_recruiter" → "closed"
  // Auto-expiry
  expires_at            DateTime  @default(now() + 7 days)  // Auto-expire if not responded to
  expiry_reminder_sent  Boolean   @default(false)  // Reminder sent at day 5
  // Response tracking
  responded_at          DateTime?
  response_time_hours   Int?      // Auto-calculated: responded_at - created_at
  // Termination
  terminated_at         DateTime?
  terminated_by         String?   // "candidate" | "recruiter"
  termination_reason    String?   // Required if terminated_by_recruiter, optional if by candidate
  // History deletion
  scheduled_deletion_at DateTime?  // Set when terminated: now + 60 days
  history_deleted_at    DateTime?
  // Cooldown
  cooldown_until        DateTime?  // Set when terminated: now + 30 days (candidate cannot re-engage)
  // Timestamps
  created_at            DateTime  @default(now())
  updated_at            DateTime  @default(now())

  candidate             User      @relation("EngagementRequestsSent", fields: [candidate_user_id], references: [id])
  recruiter             User      @relation("EngagementRequestsReceived", fields: [recruiter_user_id], references: [id])
  reviews               RecruiterReview[]
  conversation          Conversation?
  notifications         Notification[]

  @@index([candidate_user_id, status])
  @@index([recruiter_user_id, status])
  @@index([status, expires_at])
  @@index([cooldown_until])
}
```

### New Model 4: `Conversation`
Messaging thread between candidate and recruiter (1:1 per engagement).

```prisma
model Conversation {
  id                    Int       @id @default(autoincrement())
  engagement_id         Int       @unique  // 1:1 with EngagementRequest
  candidate_user_id     Int
  recruiter_user_id     Int
  is_locked             Boolean   @default(false)  // True when engagement terminated
  locked_at             DateTime?
  locked_by             String?   // "candidate" | "recruiter" | "admin"
  last_message_at       DateTime?
  created_at            DateTime  @default(now())

  engagement            EngagementRequest @relation(fields: [engagement_id], references: [id])
  candidate             User      @relation("CandidateConversations", fields: [candidate_user_id], references: [id])
  recruiter             User      @relation("RecruiterConversations", fields: [recruiter_user_id], references: [id])
  messages              Message[]
  meetings              ScheduledMeeting[]

  @@index([candidate_user_id, is_locked])
  @@index([recruiter_user_id, is_locked])
}
```

### New Model 5: `Message`
Individual message in a conversation.

```prisma
model Message {
  id                    Int       @id @default(autoincrement())
  conversation_id       Int
  sender_user_id        Int
  body                  String    // Max 5000 chars, plain text (no HTML for security)
  attachments           String    @default("[]")  // JSON array of file URLs (Supabase Storage)
  is_system_message     Boolean   @default(false)  // For automated messages ("Engagement accepted", "Meeting scheduled")
  is_read               Boolean   @default(false)
  read_at               DateTime?
  created_at            DateTime  @default(now())

  conversation          Conversation @relation(fields: [conversation_id], references: [id], onDelete: Cascade)
  sender                User      @relation(fields: [sender_user_id], references: [id])

  @@index([conversation_id, created_at])
  @@index([sender_user_id])
  @@index([is_read])
}
```

### New Model 6: `ScheduledMeeting`
Meeting scheduled within a conversation (Teams/Zoom/Phone).

```prisma
model ScheduledMeeting {
  id                    Int       @id @default(autoincrement())
  conversation_id       Int
  proposer_user_id      Int
  meeting_type          String    // "teams" | "zoom" | "phone" | "in_person"
  meeting_url           String?   // Manual paste for MVP (no API integration)
  meeting_phone         String?   // For phone meetings
  scheduled_start       DateTime
  scheduled_end         DateTime
  duration_minutes      Int       // 10 | 20 | 30 | custom
  agenda                String?   // Max 500 chars
  status                String    @default("proposed")  // "proposed" | "accepted" | "declined" | "rescheduled" | "completed" | "cancelled"
  response_note         String?
  created_at            DateTime  @default(now())

  conversation          Conversation @relation(fields: [conversation_id], references: [id], onDelete: Cascade)
  proposer              User      @relation(fields: [proposer_user_id], references: [id])

  @@index([conversation_id, status])
  @@index([scheduled_start])
}
```

### New Model 7: `CandidateJobPreference`
Candidate's job-seeking preferences (Option A: attach resume/calendar; Option B: manual entry).

```prisma
model CandidateJobPreference {
  id                    Int       @id @default(autoincrement())
  candidate_user_id     Int       @unique
  preference_mode       String    @default("option_a")
    // "option_a": Attach resume + calendar (recruiter sees both)
    // "option_b": Manual entry only (no resume/calendar shared until engagement)
    // "option_c": Resume only (no calendar)
    // "option_d": Calendar only (no resume)
  // Manual entry fields (used when option_b, option_c, or option_d)
  job_titles            String    @default("[]")  // JSON: ["Registered Nurse", "Charge Nurse"]
  specialties           String    @default("[]")  // JSON: ["ICU", "Med-Surg"]
  employment_types      String    @default("[]")  // JSON: ["contract", "prn", "permanent"]
  schedule_lengths      String    @default("[]")  // JSON: ["13 weeks", "26 weeks"]
  min_pay_rate          String?   // e.g., "$2500/week"
  preferred_shifts      String    @default("[]")  // JSON: ["Day", "Night", "Weekend"]
  available_start_date  DateTime?
  remarks               String?   // Free text, max 1000 chars
  // Visibility
  is_visible_to_recruiters Boolean @default(true)
  created_at            DateTime  @default(now())
  updated_at            DateTime  @default(now())

  candidate             User      @relation(fields: [candidate_user_id], references: [id], onDelete: Cascade)

  @@index([is_visible_to_recruiters])
}
```

### New Model 8: `RecruiterBlock`
Candidate-initiated permanent block on a recruiter.

```prisma
model RecruiterBlock {
  id                    Int       @id @default(autoincrement())
  candidate_user_id     Int
  recruiter_user_id     Int
  block_reason          String?   // Optional, free text
  is_reported           Boolean   @default(false)  // True if also reported to admin
  report_category       String?   // "spam" | "harassment" | "inappropriate" | "fraud" | "other"
  report_details        String?
  report_status         String    @default("pending")  // "pending" | "reviewing" | "actioned" | "dismissed"
  report_reviewed_by    Int?
  report_reviewed_at    DateTime?
  created_at            DateTime  @default(now())

  candidate             User      @relation("CandidateBlocks", fields: [candidate_user_id], references: [id])
  recruiter             User      @relation("BlockedRecruiters", fields: [recruiter_user_id], references: [id])

  @@unique([candidate_user_id, recruiter_user_id])  // One block per pair
  @@index([recruiter_user_id, is_reported])
  @@index([report_status])
}
```

### New Model 9: `RecruiterLeadExtension`
Extends the existing `RecruiterLead` model with marketplace-specific fields.

```prisma
model RecruiterLeadExtension {
  id                    Int       @id @default(autoincrement())
  lead_id               Int       @unique  // FK to existing RecruiterLead
  // Track exactly which fields the recruiter entered (for Rule 2 — field-level isolation)
  entered_fields        String    @default("[]")  // JSON: ["first_name", "last_name", "email", "phone"]
  // Pipeline lock status (Rule 5)
  is_locked_in_pipeline Boolean   @default(true)  // True = no other recruiter in same org can engage
  locked_at             DateTime  @default(now())
  locked_by_user_id     Int
  // Release to pool (Rule 7)
  released_to_pool      Boolean   @default(false)
  released_at           DateTime?
  released_by_user_id   Int?      // Client Admin who released
  release_reason        String?   // "recruiter_left" | "manual" | "inactive"
  // Reassignment (Rule 7)
  reassigned_from_user_id Int?
  reassigned_to_user_id   Int?
  reassigned_at           DateTime?
  reassigned_by_user_id   Int?
  // Linked engagement (if candidate accepted engagement from this recruiter)
  linked_engagement_id  Int?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @default(now())

  @@index([locked_by_user_id])
  @@index([released_to_pool])
}
```

### New Model 10: `BookOfBusiness`
Tracks a recruiter's "book of business" — their collection of leads. Used for seat management when recruiters leave.

```prisma
model BookOfBusiness {
  id                    Int       @id @default(autoincrement())
  recruiter_user_id     Int       @unique
  organization_id       Int?
  total_leads           Int       @default(0)
  active_leads          Int       @default(0)
  inactive_leads        Int       @default(0)
  // Seat status
  seat_status           String    @default("active")  // "active" | "on_hold" | "promoted" | "departed"
  seat_hold_at          DateTime?
  seat_hold_by          Int?      // Client Admin who put on hold
  // Succession
  successor_user_id     Int?      // Who took over this BOB
  succession_at         DateTime?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @default(now())

  recruiter             User      @relation(fields: [recruiter_user_id], references: [id])
  organization          Organization? @relation(fields: [organization_id], references: [id])

  @@index([organization_id, seat_status])
}
```

---

## 🔌 API ENDPOINTS

All new API routes follow existing convention: `/api/marketplace/<resource>/<action>`.

### Public Recruiter Profiles
```
GET    /api/marketplace/recruiters                        # Search recruiters (candidate side)
GET    /api/marketplace/recruiters/[slug]                 # Public profile by slug
GET    /api/marketplace/recruiters/[slug]/reviews         # Public reviews
POST   /api/marketplace/recruiters/me/profile             # Create/update own profile (recruiter)
GET    /api/marketplace/recruiters/me/profile             # Get own profile
PATCH  /api/marketplace/recruiters/me/accept-engagements  # Toggle is_accepting_engagements
```

### Engagement Requests (Candidate-initiated)
```
POST   /api/marketplace/engagements                       # Candidate sends request
GET    /api/marketplace/engagements/sent                  # Candidate's sent requests
GET    /api/marketplace/engagements/received              # Recruiter's received requests
GET    /api/marketplace/engagements/[id]                  # Get single engagement
POST   /api/marketplace/engagements/[id]/accept           # Recruiter accepts
POST   /api/marketplace/engagements/[id]/decline          # Recruiter declines
POST   /api/marketplace/engagements/[id]/terminate        # Either side terminates
POST   /api/marketplace/engagements/[id]/complete         # Mark as completed (auto after shift)
GET    /api/marketplace/engagements/expired               # Cron: auto-expire pending requests
GET    /api/marketplace/engagements/cleanup               # Cron: delete history past 60 days
```

### Conversations & Messages
```
GET    /api/marketplace/conversations                     # List user's conversations
GET    /api/marketplace/conversations/[id]                # Get single conversation
GET    /api/marketplace/conversations/[id]/messages       # Get messages (paginated)
POST   /api/marketplace/conversations/[id]/messages       # Send message
PATCH  /api/marketplace/conversations/[id]/read           # Mark messages as read
POST   /api/marketplace/conversations/[id]/meetings       # Propose meeting
POST   /api/marketplace/conversations/[id]/meetings/[meetingId]/respond  # Accept/decline meeting
```

### Reviews
```
POST   /api/marketplace/reviews                           # Leave review (post-engagement)
GET    /api/marketplace/reviews/given                     # Reviews I've given
GET    /api/marketplace/reviews/received                  # Reviews I've received
POST   /api/marketplace/reviews/[id]/flag                # Flag inappropriate review (admin)
```

### Blocks & Reports
```
POST   /api/marketplace/blocks                            # Candidate blocks recruiter
DELETE /api/marketplace/blocks/[id]                       # Candidate unblocks (after 30-day cooldown)
GET    /api/marketplace/blocks                            # List my blocks
GET    /api/marketplace/reports/pending                   # Admin: pending reports
POST   /api/marketplace/reports/[id]/action               # Admin: act on report
```

### Candidate Job Preferences
```
GET    /api/marketplace/preferences                       # Get my preferences
PUT    /api/marketplace/preferences                       # Update my preferences
PATCH  /api/marketplace/preferences/visibility            # Toggle is_visible_to_recruiters
```

### Pipeline Management (Recruiter side)
```
GET    /api/marketplace/pipeline                          # Recruiter's leads pipeline
GET    /api/marketplace/pipeline/[leadId]                 # Single lead detail
PATCH  /api/marketplace/pipeline/[leadId]/stage           # Change pipeline stage
GET    /api/marketplace/pipeline/audit-trail              # Activity history

# Client Admin overrides
POST   /api/marketplace/pipeline/[leadId]/release         # Release to pool (with warning)
POST   /api/marketplace/pipeline/[leadId]/reassign        # Reassign to another recruiter
POST   /api/marketplace/pipeline/[leadId]/promote         # Promote replacement recruiter to BOB
```

### Recruiter Conversion
```
POST   /api/marketplace/convert-to-agency                 # Individual → Agency (one-way)
GET    /api/marketplace/convert-to-agency/preview         # Preview what will happen
POST   /api/marketplace/convert-to-agency/confirm         # Confirm conversion (requires "CONVERT" typed)
```

### Recruiter Seat Management (Client Admin)
```
POST   /api/marketplace/seats/[userId]/hold               # Put recruiter seat on hold
POST   /api/marketplace/seats/[userId]/promote            # Promote replacement
POST   /api/marketplace/seats/[userId]/distribute         # Distribute BOB to other recruiters
POST   /api/marketplace/seats/[userId]/release-pool       # Release all to pool (with warning)
```

### Cron Jobs (Existing pattern)
```
GET    /api/cron/marketplace/expire-engagements           # Daily: auto-expire pending >7 days
GET    /api/cron/marketplace/send-expiry-reminders        # Daily: remind at day 5
GET    /api/cron/marketplace/cleanup-terminated-history   # Daily: delete 60-day-old terminated history
GET    /api/cron/marketplace/recalculate-response-rates   # Weekly: update recruiter response_rate_pct
GET    /api/cron/marketplace/check-cooldowns              # Daily: clear expired cooldowns
```

---

## 🎨 UI/UX PAGES

### New Public Pages
- `/recruiter/[slug]` — Public recruiter profile (LinkedIn-style)
- `/company/[slug]` — Public company page (agency recruiters + company info)
- `/find-recruiter` — Candidate's recruiter search page

### New Candidate Pages
- `/marketplace` — Candidate dashboard for marketplace activity
  - Sub-tabs: Find Recruiter / My Engagements / Saved Recruiters / Blocked
- `/marketplace/engagement/[id]` — Single engagement detail (messaging + meeting scheduler)
- `/marketplace/preferences` — Job preferences editor
- `/marketplace/blocks` — Manage blocked recruiters

### New Recruiter Pages
- `/recruiter/profile` — Edit own public profile
- `/recruiter/marketplace` — Recruiter's marketplace activity
  - Sub-tabs: Inbound Requests / Active Engagements / Pipeline / Reviews
- `/recruiter/marketplace/[engagementId]` — Single engagement (messaging + meeting scheduler)
- `/recruiter/pipeline` — Unified pipeline view (replaces scattered lead views)
- `/recruiter/pipeline/[leadId]` — Single lead detail with audit trail

### New Client Admin Pages
- `/recruiter/team/pipeline` — All recruiters' pipelines combined
- `/recruiter/team/seats` — Seat management (hold/promote/distribute)
- `/recruiter/team/audit` — Full audit log

### New Super Admin Pages
- `/superadmin/marketplace/reviews` — Moderate flagged reviews
- `/superadmin/marketplace/reports` — Review reported blocks
- `/superadmin/marketplace/verify` — Manually verify recruiters (Basic → Verified tier)

---

## 🔄 ENGAGEMENT LIFECYCLE

### Status Flow

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
   [pending] ───► [accepted] ───► [messaging] ───► [shift_offered]│
       │              │                │                  │        │
       │              │                │                  ▼        │
       │              │                │           [completed] ───┤
       │              │                │                  │        │
       │              │                │                  ▼        │
       │              │                │          [review_pending] │
       │              │                │                  │        │
       │              │                │                  ▼        │
       │              │                │              [closed] ◄───┘
       │              │                │                           │
       ▼              ▼                ▼                           │
   [declined]   [terminated_*]   [terminated_*]                    │
       │              │                │                           │
       └──────────────┴────────────────┘                           │
                      │                                            │
                      ▼                                            │
                  [closed] ◄───────────────────────────────────────┘
```

### State Transition Rules

| From | To | Triggered By | Conditions |
|---|---|---|---|
| `pending` | `accepted` | Recruiter | Within 7 days (else auto-expire) |
| `pending` | `declined` | Recruiter | Anytime before accept |
| `pending` | `closed` | System | Auto-expire after 7 days |
| `accepted` | `messaging` | System | Auto-transition when conversation starts |
| `messaging` | `shift_offered` | Recruiter | Via ShiftRequest (already built) |
| `shift_offered` | `completed` | System | When shift end date passes |
| `completed` | `review_pending` | System | Auto-transition, prompt both sides for review |
| `review_pending` | `closed` | System | After both reviews submitted OR 14 days pass |
| any active | `terminated_by_candidate` | Candidate | No reason required |
| any active | `terminated_by_recruiter` | Recruiter | Reason required (preset list) |
| `terminated_*` | `closed` | System | After 60-day history deletion completes |

### Engagement Request Fields (Candidate Sends)

```typescript
interface EngagementRequestPayload {
  recruiter_user_id: number;
  request_type: "connection" | "call" | "query";
  job_title?: string;
  specialty?: string;
  employment_type?: "contract" | "prn" | "permanent" | "travel";
  duration_weeks?: number;
  start_date?: string;  // ISO date
  end_date?: string;    // ISO date
  requested_time_off?: string[];  // ISO dates
  message?: string;     // Max 1000 chars
  verified_recruiters_only?: boolean;
}
```

### Termination Reasons (Recruiter Side, Preset List)

When a recruiter terminates, they MUST select one:
1. "Position filled by another candidate"
2. "Candidate not responsive"
3. "Candidate no longer interested"
4. "Role cancelled by facility"
5. "Candidate qualifications don't match"
6. "Other" (requires text explanation, max 200 chars)

Candidates terminating: NO reason required. After termination, candidate must:
- Leave a 1-5 star rating (required)
- Leave a text remark (optional, max 500 chars)

---

## 🚦 PIPELINE LOCK RULES (Rule 5 Detailed)

### When a Lead is Created
- `is_locked_in_pipeline = true`
- `locked_by_user_id = <recruiter who created>`
- `locked_at = now()`
- No other recruiter in same org can engage this candidate

### When Recruiter A Marks Lead as "Not Interested"
- `is_locked_in_pipeline = false`
- Lead is now available to other recruiters in same org
- Audit log entry: "Lead released by Recruiter A (marked Not Interested)"

### When Client Admin Releases to Pool
- Warning modal shown:
  > ⚠️ **Warning**: Releasing this candidate to the pool will mark them as "Not Interested" and you will lose their current pipeline tags (Interested, Interview, Offer, etc.). This action cannot be undone.
  > 
  > Type "RELEASE" to confirm:
- On confirm:
  - `released_to_pool = true`
  - `released_at = now()`
  - `released_by_user_id = <admin>`
  - Lead's pipeline_stage reset to "not_interested"
  - `is_locked_in_pipeline = false`
  - All other recruiters in org can now engage

### When Client Admin Reassigns (No Data Loss)
- `reassigned_from_user_id = <original recruiter>`
- `reassigned_to_user_id = <new recruiter>`
- `reassigned_at = now()`
- `reassigned_by_user_id = <admin>`
- `locked_by_user_id = <new recruiter>`
- Lead's pipeline_stage PRESERVED
- Full audit trail maintained

### When Client Admin Promotes Replacement
- Old recruiter's account: `seat_status = "promoted"`, `successor_user_id = <new>`
- New recruiter inherits:
  - All leads in old recruiter's BOB
  - All active engagements
  - All pipeline history
  - Old recruiter's reviews STAY with old recruiter (not transferred)
- Old recruiter's email + password replaced with new recruiter's credentials
- Old recruiter can no longer log in

---

## ⏰ COOLDOWN & AUTO-EXPIRY RULES

### Engagement Request Expiry
- Pending requests auto-expire after **7 days**
- Reminder email sent at **day 5** if not responded to
- On expiry: status → `closed`, both parties notified

### Termination Cooldown
- After termination, candidate CANNOT send new engagement request to same recruiter for **30 days**
- After 30 days, candidate can re-engage (cooldown cleared)
- Recruiter can NEVER re-engage (since they can't initiate — Rule 3)

### Block Cooldown
- Candidate can unblock a recruiter after **30 days** (to prevent rapid block/unblock cycles)
- After unblock, candidate can send new engagement request immediately

### History Deletion
- On termination: `scheduled_deletion_at = now() + 60 days`
- Daily cron job checks for conversations past deletion date
- On deletion: `history_deleted_at = now()`, all messages soft-deleted (no longer visible to either party)
- Audit log entry preserved (who/when/why) but message content gone
- Compliance: 60-day retention window satisfies most healthcare audit requirements

---

## 🛡️ VERIFICATION & TRUST SYSTEM

### Verified Recruiter Tiers

| Tier | Requirements | Badge Display | How to Apply |
|---|---|---|---|
| **Basic** | Email verified, account >30 days old | Gray "Basic" badge | Automatic |
| **Verified** | Basic + phone verified + admin manual review | Blue "Verified" badge with checkmark | Recruiter requests via profile settings |
| **Premium** | Verified + 10+ positive reviews + active paid subscription | Gold "Premium" badge with star | Automatic when criteria met (post-Stripe) |

### Verification Process (Basic → Verified)
1. Recruiter submits verification request from profile settings
2. Provides: phone number (for SMS verification), LinkedIn URL, brief bio
3. Super Admin reviews in `/superadmin/marketplace/verify`
4. Admin can: approve, request more info, or reject
5. On approve: `is_verified = "verified"`, `verified_at = now()`, `verified_by = <admin>`
6. Recruiter receives notification + email

### Trust Signals on Public Profile

Each recruiter profile displays:
1. **Verified badge** (Basic / Verified / Premium)
2. **Years of experience** (manually entered)
3. **Total placements** (manually entered)
4. **Response rate %** (auto-calculated weekly)
5. **Average response time** (auto-calculated weekly)
6. **Star rating** (aggregate of all reviews, 1 decimal: "4.8 ★")
7. **Total reviews count** (e.g., "23 reviews")
8. **Specialties as tags** (clickable for candidate-side filtering)
9. **States of operation** (e.g., "CA, NV, AZ")
10. **Currently accepting engagements** toggle (green dot when active)
11. **Member since** date (e.g., "Member since March 2026")
12. **Agency affiliation** (if agency recruiter: company name clickable to company page)
13. **Recent activity** (last login indicator: "Active in last 24 hours")

### Review Display Rules
- Reviews visible on public profile
- Reviews sorted by: most recent first
- Star distribution shown (5★: 18, 4★: 4, 3★: 1, etc.)
- Individual reviews show: star rating, text, reviewer first name + last initial, date, engagement type
- Reviews can be flagged by anyone (goes to admin moderation queue)
- Admin can hide reviews (sets `is_visible = false`) without deleting

---

## 💼 INDIVIDUAL → AGENCY CONVERSION FLOW

### Step 1: Preview
Recruiter visits `/recruiter/settings/convert-to-agency`:
- Sees their current individual profile
- Sees what will change:
  - Profile will move under new company page
  - All leads will transfer to company
  - All reviews stay tied to individual profile
  - Email becomes company admin email
  - **Cannot be reversed**
- Must check "I understand this is permanent"
- Must check "I understand my leads become company assets"

### Step 2: Company Info Form
- Company name
- Company logo (upload)
- Company address, phone, email, website
- Company description
- Number of recruiter seats (default: 5, max for free tier)

### Step 3: Confirmation
- Modal: "Type 'CONVERT' to confirm conversion to agency account"
- On confirm:
  1. Create new `Organization` with company info
  2. Update user: `organization_id = new_org.id`, `role = "client_admin"`
  3. Update `RecruiterProfile.recruiter_type = "agency"`
  4. Create `BookOfBusiness` record linked to new org
  5. All existing leads migrated: `organization_id = new_org.id`
  6. All existing engagements preserved
  7. All existing reviews stay on individual profile
  8. Send confirmation email
  9. Redirect to `/recruiter/dashboard` with success toast

### What Stays with Individual
- Reviews (tied to user_id, not org_id)
- Profile slug (stays the same)
- Profile bio, specialties, etc.
- All engagement history

### What Transfers to Company
- All leads (now visible to all company recruiters per Rule 5/6)
- All active engagements (visible to client admin)
- Pipeline history

---

## 📅 BUILD SEQUENCE (Phased Approach)

**Do NOT skip phases. Each phase must be in production for 2+ weeks before next phase starts.**

### Phase 0 — Validation (4 weeks, NO BUILDING)
**Goal**: Prove the marketplace hypothesis before building.

Tasks:
1. Install Vercel Analytics + PostHog
2. Recruit 10 real recruiters + 30 real candidates
3. Conduct 5 user interviews (15 min each)
4. Watch 3 session recordings
5. Document findings in `/docs/phase-0-findings.md`

**Exit Criteria** (must answer YES to all):
- [ ] At least 3 recruiters have asked for "a way to share my profile with candidates"
- [ ] At least 5 candidates have asked "how do I find recruiters on this platform"
- [ ] At least 2 recruiters have complained about "another recruiter at my agency contacted my candidate"
- [ ] You can articulate the #1 user complaint in one sentence

If exit criteria NOT met → DO NOT build marketplace. Pivot based on findings.

---

### Phase 1 — Recruiter Public Profiles (3 weeks)
**Goal**: Recruiters get a shareable professional presence.

Build:
- `RecruiterProfile` model + migrations
- `/recruiter/[slug]` public page (read-only)
- `/recruiter/profile` edit page (recruiters only)
- `/recruiter/profile/verify` verification request flow
- `/superadmin/marketplace/verify` admin review page
- Response rate + avg response time auto-calculation (weekly cron)
- "Accepting engagements" toggle
- Trust signals display (years exp, placements, specialties, states)
- Mobile responsive

**Not included yet**: Reviews, search, engagement requests

**Exit Criteria**:
- [ ] 5+ recruiters have created and shared their profile links externally
- [ ] At least 2 recruiters have been verified by admin
- [ ] Profile page has <2 second load time

---

### Phase 2 — Candidate Search + Engagement Requests (4 weeks)
**Goal**: Candidates can find and request to engage with recruiters.

Build:
- `EngagementRequest` model + migrations
- `CandidateJobPreference` model + migrations
- `/find-recruiter` search page with filters (specialty, state, verified tier, accepting engagements)
- `/marketplace/preferences` candidate preferences editor
- `/api/marketplace/engagements` full CRUD
- Engagement request form (with all job preference fields)
- Auto-expiry cron (7 days + day-5 reminder)
- Recruiter's inbound requests dashboard
- Accept/decline flow
- Notification system extensions (engagement_request_received, engagement_accepted, engagement_declined, engagement_expired)
- Email templates (via Brevo) for all notifications

**Not included yet**: In-app messaging (Phase 3)

**Exit Criteria**:
- [ ] At least 20 engagement requests sent by candidates
- [ ] At least 50% acceptance rate from recruiters
- [ ] At least 3 candidates have found a recruiter via search (vs. direct link)

---

### Phase 3 — In-App Messaging + Meeting Scheduler (4 weeks)
**Goal**: Conversations happen on-platform, not via email/text.

Build:
- `Conversation`, `Message`, `ScheduledMeeting` models + migrations
- Real-time-ish messaging (polling every 5 seconds — no WebSocket yet, keep it simple)
- `/marketplace/engagement/[id]` messaging UI
- Meeting scheduler (manual link paste for Teams/Zoom — NO API integration yet)
- Message read receipts
- File attachments (Supabase Storage)
- System messages ("Engagement accepted", "Meeting scheduled for X")
- Mobile-responsive messaging UI
- Email notifications for new messages (with 5-min digest to avoid spam)

**Not included yet**: Reviews, terminations formal flow

**Exit Criteria**:
- [ ] At least 50 messages sent across 10+ conversations
- [ ] At least 5 meetings scheduled via the in-app scheduler
- [ ] No message send failures (reliable delivery)

---

### Phase 4 — Reviews, Ratings & Termination (3 weeks)
**Goal**: Trust system + clean engagement lifecycle.

Build:
- `RecruiterReview` model + migrations
- `RecruiterBlock` model + migrations
- `RecruiterLeadExtension` model + migrations
- Termination flow (both sides, with reason capture for recruiter side)
- 60-day history deletion cron
- 30-day cooldown enforcement
- Review submission flow (post-termination or post-completion)
- Review display on public profile
- Review flagging + admin moderation queue
- Block flow (candidate blocks recruiter)
- Report flow (candidate reports recruiter to admin)
- `/superadmin/marketplace/reports` admin moderation page

**Exit Criteria**:
- [ ] At least 10 reviews submitted
- [ ] At least 3 terminations processed cleanly
- [ ] History deletion cron verified working on test data

---

### Phase 5 — Pipeline Locking + Client Admin Powers (2 weeks)
**Goal**: Multi-recruiter agencies don't trip over each other.

Build:
- `BookOfBusiness` model + migrations
- Pipeline lock enforcement (Rule 5) in all lead-creation endpoints
- `/recruiter/pipeline` unified view (replaces scattered lead views)
- `/recruiter/pipeline/[leadId]` detail with audit trail
- `/recruiter/team/pipeline` (client admin only — all recruiters' pipelines)
- "Release to Pool" action (with warning modal)
- "Reassign" action
- "Promote" action (seat succession)
- `/recruiter/team/seats` seat management page
- `/recruiter/team/audit` full audit log

**Exit Criteria**:
- [ ] At least 2 agencies are using 3+ recruiter seats
- [ ] Pipeline lock prevents at least 1 conflict (verified via audit log)
- [ ] At least 1 successful "Release to Pool" or "Reassign" action

---

### Phase 6 — Individual → Agency Conversion (2 weeks)
**Goal**: Successful individual recruiters can graduate to agency status.

Build:
- `/api/marketplace/convert-to-agency` endpoints (preview, confirm)
- `/recruiter/settings/convert-to-agency` UI
- Multi-step confirmation flow with warnings
- Data migration logic (leads → org, reviews stay with user)
- `/company/[slug]` public company page
- Company page shows nested recruiter profiles
- Email notification on conversion

**Exit Criteria**:
- [ ] At least 1 individual recruiter has successfully converted to agency
- [ ] All their leads and engagements preserved
- [ ] All their reviews still visible on their individual profile (now nested under company)

---

### Phase 7 — Polish & Mobile (1 week)
**Goal**: Production-ready across all devices.

Tasks:
- Mobile responsive audit (all new pages)
- Performance audit (Lighthouse >90 on all new pages)
- Accessibility audit (WCAG 2.1 AA)
- SEO optimization (public recruiter/company pages indexable)
- Error boundary + error logging
- User documentation (help center articles)
- Admin training docs (for super admin moderation)

**Total realistic timeline: 13 weeks (3 months)**

---

## ⚠️ EDGE CASES & DECISIONS LOG

Documented decisions on tricky scenarios. Add to this list as new edge cases emerge during build.

### Edge Case 1: Recruiter A enters lead with email, Recruiter B enters same candidate with phone
**Decision**: Two separate lead records. Neither recruiter knows about the other. When candidate accepts engagement from one, the other's lead remains in their pipeline (they just don't know candidate is engaged elsewhere).

### Edge Case 2: Candidate updates their email after being added as a lead
**Decision**: Lead data does NOT auto-update. Recruiter still sees the old email they entered. If candidate wants recruiter to have new email, they must share it post-engagement.

### Edge Case 3: Recruiter A's lead says "Med-Surg" but candidate is actually ICU
**Decision**: Recruiter A's data wins for Recruiter A's view. The candidate's real specialty only becomes visible post-engagement (if candidate shares resume). No automatic correction.

### Edge Case 4: Two recruiters from same company both have leads for same candidate (entered before lock)
**Decision**: First-come-first-serve. Whichever recruiter created the lead first gets the lock. Second recruiter's lead attempt is blocked with message: "This candidate is already in [Recruiter A]'s pipeline. Contact them or your Client Admin."

### Edge Case 5: Candidate blocks Recruiter A, then re-engages later (after 30-day cooldown)
**Decision**: Block is lifted after 30 days. Candidate can send new engagement request. Old engagement history (if terminated and past 60-day deletion) is gone. Fresh start.

### Edge Case 6: Recruiter converts to agency, what happens to their existing individual reviews?
**Decision**: Reviews stay tied to user_id. They appear on the individual's profile (now nested under company page). Company aggregate rating is calculated from ALL recruiters' reviews at that company.

### Edge Case 7: Candidate sends engagement request to recruiter who is "Not accepting engagements"
**Decision**: Request is blocked at submit time with message: "This recruiter is not currently accepting new engagements." Candidate can save recruiter to "Saved Recruiters" list for later.

### Edge Case 8: Recruiter doesn't respond to engagement request, it expires
**Decision**: Auto-expire at 7 days. Both parties notified. Candidate can re-send to same recruiter (no cooldown for expiry, only for termination). Recruiter's response_rate_pct is negatively impacted.

### Edge Case 9: Recruiter puts seat "on hold" — what happens to active engagements?
**Decision**: Active engagements are PAUSED (no new messages can be sent by either side). Client Admin must either promote a successor (engagements transfer) or distribute the BOB. Engagements are NOT auto-terminated.

### Edge Case 10: Candidate wants to message recruiter but engagement was terminated by recruiter
**Decision**: Conversation is locked. Candidate sees: "This conversation was ended by [Recruiter Name] on [date]." Candidate can start a NEW engagement request after 30-day cooldown.

---

## 🚨 RISKS & MITIGATIONS

### Risk 1: Cold Start Problem (No Liquidity)
**Risk**: Candidates find no recruiters → leave → recruiters find no candidates → leave.
**Mitigation**: 
- Phase 0 ensures 10+ recruiters have profiles BEFORE candidate search launches
- Pre-populate recruiter profiles during Phase 1 (recruiters can create profiles before search goes live)
- Featured recruiters on `/find-recruiter` homepage (rotating)

### Risk 2: Recruiter Spam (Recruiters mass-messaging candidates)
**Risk**: Since recruiters can't search candidates, this risk is LOW. But they could spam via engagement requests if we add reverse flow later.
**Mitigation**: 
- Currently recruiters CANNOT initiate engagement requests (only candidates can)
- If we add reverse flow later, enforce daily limits (max 10 requests/day per recruiter)

### Risk 3: Review Bombing
**Risk**: Coordinated negative reviews against a recruiter.
**Mitigation**: 
- Review eligibility requires completed engagement (Rule 8)
- Admin can hide reviews without deleting
- Pattern detection: if 5+ negative reviews from new accounts in 24 hours, auto-flag for review

### Risk 4: Data Privacy Compliance (HIPAA)
**Risk**: Marketplace features could leak PHI if not careful.
**Mitigation**: 
- Recruiter profiles contain NO candidate data
- Conversations are between authenticated users only (no public access)
- Message attachments stored in private Supabase buckets (pre-signed URLs)
- 60-day history deletion helps with data minimization

### Risk 5: Performance (Search queries)
**Risk**: Recruiter search could be slow with thousands of profiles.
**Mitigation**: 
- Index on `profile_slug`, `specialties`, `states_of_operation`, `is_accepting_engagements`
- Limit search results to 50 per page
- Cache popular search queries (1-hour TTL)

### Risk 6: Abuse of "Release to Pool"
**Risk**: Client Admins could maliciously release competitors' candidates.
**Mitigation**: 
- Full audit trail (who/when/why)
- Warning modal with typed confirmation
- Cannot be undone (must re-engage candidate from scratch)

---

## 📋 OPEN QUESTIONS (To Resolve During Build)

1. **Should candidates be able to see recruiter's response time before sending request?**
   - Pros: Helps candidates pick responsive recruiters
   - Cons: New recruiters with no data look bad
   - Recommendation: Show only after recruiter has 5+ engagements

2. **Should there be a "Premium" candidate tier (paid) that gets priority placement in recruiter searches?**
   - Wait — recruiters can't search candidates (Rule 3). Question is moot.
   - If we add reverse flow later, revisit.

3. **Should engagement requests support attachments (resume, certifications)?**
   - Pros: Faster information sharing
   - Cons: Bypasses the consent_shares system
   - Recommendation: NO. Keep engagement requests text-only. Use existing sharing flow post-engagement.

4. **What happens if a recruiter's company is suspended by Super Admin?**
   - All recruiters at that company: `is_accepting_engagements = false`
   - Active engagements preserved (can be terminated by either side)
   - No new engagement requests can be received
   - Public profiles display: "Company account under review"

5. **Should we support team inboxes (multiple recruiters share one conversation)?**
   - No for v1.0. Each conversation is 1:1.
   - Client Admin can VIEW any conversation in their company but cannot participate.

6. **Should messages support rich text formatting?**
   - No for v1.0. Plain text only. Prevents XSS and keeps it simple.
   - URLs auto-linked.

---

## 🎯 SUCCESS METRICS

Track these from day 1 of Phase 1 launch:

### Marketplace Health
- **Recruiter profiles created**: Target 50 by end of Phase 2
- **Verified recruiters**: Target 20 by end of Phase 2
- **Engagement requests sent**: Target 100 by end of Phase 3
- **Engagement acceptance rate**: Target >50%
- **Active conversations**: Target 30+ concurrent by end of Phase 3
- **Reviews submitted**: Target 50 by end of Phase 4
- **Average recruiter rating**: Target >4.0 ★

### User Engagement
- **% of candidates who visit /find-recruiter**: Target >30% of active candidates
- **% of recruiters who share their profile link externally**: Target >40%
- **Avg messages per conversation**: Target >5 (indicates real conversation, not just "hi")
- **Engagement → Shift placement conversion**: Target >10% (long-term, post Phase 5)

### Operational
- **Avg response time (recruiter to candidate)**: Target <24 hours
- **Auto-expiry rate**: Target <20% (most requests should get responses)
- **Termination rate**: Target <15% (most engagements should complete naturally)
- **Block rate**: Target <5% (low toxicity)

---

## 📚 REFERENCE DOCUMENTS

- **Existing platform spec**: `/docs/feature-audit.md` (built features inventory)
- **DB safety rules**: `/DB-SAFETY-RULES.md` (mandatory read before any DB work)
- **Strategic roadmap**: `/docs/STRATEGIC-ROADMAP.md` (broader product vision)
- **Existing schema**: `/prisma/schema.prisma` (47 models as of June 2026)

---

## ✅ FINAL CONFIRMATION CHECKLIST

Before handing this spec to an engineer in 3-4 months, confirm:

- [ ] Phase 0 validation is complete and exit criteria met
- [ ] At least 10 real recruiters + 30 real candidates are active on platform
- [ ] User interviews confirmed demand for marketplace features
- [ ] Stripe is live (needed for Premium tier in Phase 4)
- [ ] Supabase RLS is enabled (security baseline)
- [ ] Backup process is tested and verified
- [ ] This document has been re-read by founder and any open questions resolved
- [ ] Engineer (Super Z or other) has been briefed and has access to codebase

---

## 📝 DOCUMENT HISTORY

| Date | Author | Change |
|---|---|---|
| June 17, 2026 | Super Z (CTO) | Initial spec created after discussion with founder |
| | | Captures all 7 design points + 7 founder clarifications |
| | | Includes 10 suggested additional rules/features |
| | | Phased build plan (13 weeks total) |
| | | Phase 0 validation required before any building |

---

**End of Specification Document**

*This document represents the agreed-upon design as of June 17, 2026. Any changes after this date should be documented in a new revision section above. The core spec (Rules 1-10, data models, API endpoints, build sequence) should remain stable; only Phase 0 findings may adjust priorities.*
