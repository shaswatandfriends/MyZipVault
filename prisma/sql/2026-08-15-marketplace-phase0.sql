-- ───────────────────────────────────────────────────────────────────
-- Migration: Marketplace Phase 0 — Schema Foundation
-- Date: 2026-08-15
-- Purpose: Add 10 new tables for the marketplace feature
--
-- This is 100% ADDITIVE — no existing tables are modified.
-- All new columns are nullable/optional to avoid breaking existing code.
-- Run this in Supabase SQL Editor BEFORE deploying the schema push.
-- ───────────────────────────────────────────────────────────────────

-- ───────────────────────────────────────────────────────────────────
-- 1. CandidateRecord — the 1M healthcare candidate pool
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CandidateRecord" (
  "id"                       SERIAL PRIMARY KEY,
  "public_id"                UUID UNIQUE DEFAULT gen_random_uuid(),
  "first_name"               TEXT,
  "last_name"                TEXT,
  "city"                     TEXT,
  "state"                    TEXT,
  "job_title"                TEXT,
  "specialty"                TEXT,
  "profession"               TEXT,  -- nursing, allied, physician, non-clinical, IT
  "years_of_experience"     INTEGER,
  "willing_to_relocate"     BOOLEAN DEFAULT FALSE,
  "license_number"           TEXT,
  "license_state"            TEXT,
  "npi_number"               TEXT,  -- National Provider Identifier (for physicians)
  -- Source tracking
  "source"                   TEXT NOT NULL DEFAULT 'platform_pool',
    -- 'platform_pool' (came with the 1M list)
    -- 'recruiter_submitted' (Path B — recruiter brought them)
    -- 'self_signup' (candidate signed up themselves)
  "original_owner_recruiter_id" INTEGER,  -- FK to User (recruiter who brought them, if Path B)
  "imported_at"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for dedup + search
CREATE INDEX IF NOT EXISTS idx_candidate_record_first_last ON "CandidateRecord" ("first_name", "last_name");
CREATE INDEX IF NOT EXISTS idx_candidate_record_specialty_state ON "CandidateRecord" ("specialty", "state");
CREATE INDEX IF NOT EXISTS idx_candidate_record_source ON "CandidateRecord" ("source");
CREATE INDEX IF NOT EXISTS idx_candidate_record_owner ON "CandidateRecord" ("original_owner_recruiter_id");

-- ───────────────────────────────────────────────────────────────────
-- 2. CandidateContactInfo — historical email/phone values (append-only)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CandidateContactInfo" (
  "id"                       SERIAL PRIMARY KEY,
  "candidate_record_id"      INTEGER NOT NULL REFERENCES "CandidateRecord"("id") ON DELETE CASCADE,
  "type"                     TEXT NOT NULL,  -- 'email' | 'phone'
  "value"                    TEXT NOT NULL,  -- the original (display) value, e.g., "+1 (555) 123-4567"
  "value_normalized"         TEXT NOT NULL,  -- for dedup: lowercase + trimmed email, or E.164 phone
  -- Provenance — who added this contact info
  "added_by_recruiter_id"    INTEGER,  -- FK to User (if recruiter added it)
  "added_by_candidate"       BOOLEAN DEFAULT FALSE,  -- true if candidate self-added
  "added_at"                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Primary flag — the LATEST entry of each type is marked primary automatically
  -- (enforced in application logic; not via DB constraint to allow flexibility)
  "is_primary"               BOOLEAN DEFAULT FALSE,
  -- Visibility — recruiter-added info stays private for 90 days, then becomes public
  "is_visible_to_others"     BOOLEAN DEFAULT TRUE,
  "visible_after"            TIMESTAMP,  -- null = immediately visible; otherwise visible only after this date
  -- Deletion — soft-delete only, by admin
  "deleted_at"               TIMESTAMP,
  "deleted_by_admin_id"      INTEGER,
  "deletion_reason"          TEXT
);

-- Indexes for dedup lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_contact_normalized
  ON "CandidateContactInfo" ("type", "value_normalized")
  WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_contact_record ON "CandidateContactInfo" ("candidate_record_id");
CREATE INDEX IF NOT EXISTS idx_candidate_contact_value_norm ON "CandidateContactInfo" ("value_normalized");

-- ───────────────────────────────────────────────────────────────────
-- 3. JobPosting — jobs posted by the platform for recruiters to work
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "JobPosting" (
  "id"                       SERIAL PRIMARY KEY,
  "public_id"                UUID UNIQUE DEFAULT gen_random_uuid(),
  "title"                    TEXT NOT NULL,
  "profession"               TEXT,  -- nursing, allied, physician, etc.
  "specialty"                TEXT,  -- ICU, ER, Med-Surg, etc.
  "job_title"                TEXT,  -- specific role title
  "employment_type"          TEXT,  -- permanent | travel | contract | per_diem | locum
  "city"                     TEXT,
  "state"                    TEXT,
  "is_remote"                BOOLEAN DEFAULT FALSE,
  -- Compensation (shown to recruiters, NOT to candidates)
  "salary_min"               DECIMAL(12, 2),
  "salary_max"               DECIMAL(12, 2),
  "salary_display"           TEXT,  -- e.g., "$200k" or "$90-110/hr"
  "currency"                 TEXT DEFAULT 'USD',
  -- Commission (recruiter-facing only)
  "commission_amount"       DECIMAL(12, 2),  -- flat fee
  "commission_percentage"    DECIMAL(5, 2),   -- OR % of salary
  "commission_type"          TEXT,  -- 'flat' | 'percentage'
  -- Description
  "description"              TEXT,
  "requirements"             TEXT,  -- JSON array of requirements
  "nice_to_have"             TEXT,  -- JSON array of nice-to-haves
  -- Status
  "status"                   TEXT NOT NULL DEFAULT 'draft',  -- draft | open | paused | filled | cancelled
  "is_public"                BOOLEAN DEFAULT FALSE,  -- true = visible to candidates browsing; false = recruiter-only
  "open_date"                TIMESTAMP,
  "close_date"               TIMESTAMP,
  -- Attribution
  "posted_by_user_id"        INTEGER,  -- FK to User (the superadmin/platform_admin who posted)
  "organization_id"          INTEGER,  -- FK to Organization (the employer, if applicable)
  -- Tracking
  "views_count"              INTEGER DEFAULT 0,
  "applications_count"       INTEGER DEFAULT 0,
  "submissions_count"        INTEGER DEFAULT 0,
  "created_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_posting_status ON "JobPosting" ("status", "is_public");
CREATE INDEX IF NOT EXISTS idx_job_posting_profession_specialty ON "JobPosting" ("profession", "specialty");
CREATE INDEX IF NOT EXISTS idx_job_posting_location ON "JobPosting" ("state", "city");

-- ───────────────────────────────────────────────────────────────────
-- 4. CandidateSubmission — recruiter submits candidate → job
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CandidateSubmission" (
  "id"                       SERIAL PRIMARY KEY,
  "candidate_record_id"      INTEGER NOT NULL REFERENCES "CandidateRecord"("id"),
  "job_id"                   INTEGER NOT NULL REFERENCES "JobPosting"("id"),
  "recruiter_user_id"        INTEGER NOT NULL,  -- FK to User (the submitting recruiter)
  "organization_id"           INTEGER,  -- FK to Organization (recruiter's org)
  -- FIRST-SUBMISSION-WINS: enforced by unique constraint below.
  -- The timestamp is captured at millisecond precision.
  "submitted_at_ms"          BIGINT NOT NULL,  -- Unix epoch in milliseconds
  "submitted_at"             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- RTR (Right to Represent) — link to VaultSign document
  "rtr_vault_sign_document_id" INTEGER,  -- FK to VaultSignDocument
  "rtr_signed_at"           TIMESTAMP,
  -- Status workflow
  "status"                   TEXT NOT NULL DEFAULT 'submitted',
    -- 'submitted' | 'reviewing' | 'interview' | 'offer' | 'placed' | 'rejected' | 'withdrawn'
  "status_history"           TEXT,  -- JSON array of {status, changed_at, changed_by_user_id}
  -- Notes (recruiter-internal)
  "recruiter_notes"          TEXT,
  -- Tiebreak info — for the same-millisecond case
  "tiebreak_recruiter_reputation" FLOAT,  -- snapshot at submission time
  "tiebreak_won"             BOOLEAN DEFAULT FALSE,
  -- Revenue tracking
  "placement_fee"            DECIMAL(12, 2),  -- captured when status=placed
  "recruiter_payout"         DECIMAL(12, 2),  -- 70% / 75% / 68% based on ownership phase
  "platform_payout"          DECIMAL(12, 2),  -- 30% / 25% / 30%
  "original_owner_residual"  DECIMAL(12, 2),  -- 2% if within 90-180d residual window
  "payout_split_phase"       TEXT,  -- 'exclusive' | 'residual' | 'open'
  "placed_at"                TIMESTAMP,
  "created_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FIRST-SUBMISSION-WINS: one candidate → one job → only ONE recruiter can submit
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_submission_unique
  ON "CandidateSubmission" ("candidate_record_id", "job_id");

CREATE INDEX IF NOT EXISTS idx_candidate_submission_recruiter ON "CandidateSubmission" ("recruiter_user_id");
CREATE INDEX IF NOT EXISTS idx_candidate_submission_job ON "CandidateSubmission" ("job_id");
CREATE INDEX IF NOT EXISTS idx_candidate_submission_status ON "CandidateSubmission" ("status");
CREATE INDEX IF NOT EXISTS idx_candidate_submission_submitted_at ON "CandidateSubmission" ("submitted_at_ms" DESC);

-- ───────────────────────────────────────────────────────────────────
-- 5. CandidateOwnershipWindow — 90-day exclusive + 90-180 residual
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CandidateOwnershipWindow" (
  "id"                       SERIAL PRIMARY KEY,
  "candidate_record_id"      INTEGER NOT NULL REFERENCES "CandidateRecord"("id"),
  "recruiter_user_id"        INTEGER NOT NULL,  -- FK to User (the owner recruiter)
  "organization_id"          INTEGER,  -- FK to Organization (recruiter's org)
  -- Window timestamps (clock starts at candidate CREATION, not RTR)
  "exclusive_window_start"   TIMESTAMP NOT NULL,  -- = candidate_record.created_at
  "exclusive_window_end"     TIMESTAMP NOT NULL,  -- exclusive_start + 90 days
  "residual_window_end"      TIMESTAMP NOT NULL,  -- exclusive_end + 90 days
  -- Current state (computed, but stored for fast queries)
  "current_phase"            TEXT NOT NULL DEFAULT 'exclusive',
    -- 'exclusive' (0-90d) | 'residual' (90-180d) | 'expired' (180d+)
  "phase_computed_at"        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Payout splits applicable during each phase
  "exclusive_recruiter_pct"  DECIMAL(5,2) DEFAULT 75.00,  -- 75% during exclusive
  "exclusive_platform_pct"  DECIMAL(5,2) DEFAULT 25.00,  -- 25% during exclusive
  "residual_recruiter_pct"   DECIMAL(5,2) DEFAULT 68.00,  -- 68% during residual
  "residual_platform_pct"    DECIMAL(5,2) DEFAULT 30.00,  -- 30% during residual
  "residual_original_pct"    DECIMAL(5,2) DEFAULT 2.00,   -- 2% to original owner during residual
  "open_recruiter_pct"       DECIMAL(5,2) DEFAULT 70.00,  -- 70% after 180d
  "open_platform_pct"        DECIMAL(5,2) DEFAULT 30.00,  -- 30% after 180d
  -- Status
  "is_active"                BOOLEAN DEFAULT TRUE,
  "created_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ownership_candidate_active
  ON "CandidateOwnershipWindow" ("candidate_record_id")
  WHERE "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS idx_ownership_recruiter ON "CandidateOwnershipWindow" ("recruiter_user_id");
CREATE INDEX IF NOT EXISTS idx_ownership_phase ON "CandidateOwnershipWindow" ("current_phase");

-- ───────────────────────────────────────────────────────────────────
-- 6. CandidateContactReveal — credit-gated contact info unlock
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CandidateContactReveal" (
  "id"                       SERIAL PRIMARY KEY,
  "candidate_record_id"      INTEGER NOT NULL REFERENCES "CandidateRecord"("id"),
  "recruiter_user_id"        INTEGER NOT NULL,  -- FK to User
  "organization_id"          INTEGER NOT NULL,  -- FK to Organization
  "contact_info_id"          INTEGER REFERENCES "CandidateContactInfo"("id"),  -- which email/phone was revealed
  "credits_charged"          INTEGER NOT NULL DEFAULT 0,
  "revealed_at"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Reveal is valid for 90 days from reveal date (matches ownership window)
  "expires_at"               TIMESTAMP NOT NULL,
  "is_expired"               BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reveal_recruiter ON "CandidateContactReveal" ("recruiter_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS idx_reveal_unique
  ON "CandidateContactReveal" ("candidate_record_id", "recruiter_user_id", "contact_info_id")
  WHERE "is_expired" = FALSE;

-- ───────────────────────────────────────────────────────────────────
-- 7. RecruiterReputationScore — aggregate score per recruiter
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RecruiterReputationScore" (
  "recruiter_user_id"        INTEGER PRIMARY KEY,  -- = User.id
  "total_reviews"            INTEGER DEFAULT 0,
  "verified_reviews"         INTEGER DEFAULT 0,
  -- Aggregate scores (0-10, weighted)
  "overall_score"            DECIMAL(3,1) DEFAULT 0.0,
  "professionalism_avg"      DECIMAL(3,1) DEFAULT 0.0,
  "communication_avg"        DECIMAL(3,1) DEFAULT 0.0,
  "job_match_avg"            DECIMAL(3,1) DEFAULT 0.0,
  "process_speed_avg"        DECIMAL(3,1) DEFAULT 0.0,
  "post_placement_avg"       DECIMAL(3,1) DEFAULT 0.0,
  -- Other reputation signals
  "total_placements"         INTEGER DEFAULT 0,
  "avg_time_to_fill_days"    DECIMAL(5,1),
  "candidate_retention_pct" DECIMAL(5,2),  -- 0-100
  "avg_response_hours"       DECIMAL(5,1),
  -- Status / badges
  "badge_tier"               TEXT DEFAULT 'none',  -- 'none' | 'verified' | 'top'
  "is_top_recruiter"         BOOLEAN DEFAULT FALSE,
  "is_verified_recruiter"    BOOLEAN DEFAULT FALSE,
  "last_calculated_at"       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────
-- 8. RecruiterReview — individual reviews (multi-dimensional)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RecruiterReview" (
  "id"                       SERIAL PRIMARY KEY,
  "recruiter_user_id"        INTEGER NOT NULL,  -- who is being reviewed
  "reviewer_user_id"         INTEGER,  -- who left the review (null = anonymous)
  "reviewer_role"            TEXT NOT NULL,  -- 'candidate' | 'employer' | 'recruiter_peer'
  -- Multi-dimensional ratings (each 1-10)
  "professionalism"          INTEGER NOT NULL,
  "communication"            INTEGER NOT NULL,
  "job_match"                INTEGER NOT NULL,
  "process_speed"            INTEGER NOT NULL,
  "post_placement"           INTEGER NOT NULL,
  -- Free-text comment
  "comment"                  TEXT,
  -- Status
  "is_anonymous"             BOOLEAN DEFAULT FALSE,
  "is_verified_placement"    BOOLEAN DEFAULT FALSE,  -- tied to actual CandidateSubmission
  "status"                   TEXT DEFAULT 'active',  -- 'active' | 'flagged' | 'removed'
  -- Recruiter reply (one per review, can't edit)
  "recruiter_reply"          TEXT,
  "recruiter_replied_at"     TIMESTAMP,
  -- Dispute flag
  "has_dispute"              BOOLEAN DEFAULT FALSE,
  "dispute_status"           TEXT,  -- 'pending' | 'investigating' | 'upheld' | 'removed' | 'annotated' | 'dismissed'
  "admin_annotation"         TEXT,  -- shown publicly under the review IF dispute is partially upheld
  -- Linkage
  "submission_id"            INTEGER REFERENCES "CandidateSubmission"("id"),
  "job_id"                   INTEGER REFERENCES "JobPosting"("id"),
  -- Timestamps
  "created_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One review per placement per reviewer
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_unique
  ON "RecruiterReview" ("reviewer_user_id", "submission_id")
  WHERE "reviewer_user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_recruiter_status ON "RecruiterReview" ("recruiter_user_id", "status");
CREATE INDEX IF NOT EXISTS idx_review_dispute ON "RecruiterReview" ("has_dispute", "dispute_status");

-- ───────────────────────────────────────────────────────────────────
-- 9. RecruiterReport — formal complaints
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RecruiterReport" (
  "id"                       SERIAL PRIMARY KEY,
  "recruiter_user_id"        INTEGER NOT NULL,  -- who is being reported
  "reporter_user_id"         INTEGER,  -- who filed the report (null = anonymous)
  "reporter_role"            TEXT NOT NULL,  -- 'candidate' | 'employer' | 'recruiter_peer'
  -- Report details
  "reason_category"          TEXT NOT NULL,
    -- 'misrepresentation' | 'harassment' | 'fee_dispute' | 'rtr_violation' | 'data_misuse' | 'other'
  "description"              TEXT NOT NULL,  -- min 50 chars (enforced in app)
  -- Evidence
  "evidence_urls"            TEXT,  -- JSON array of doc links
  -- Status
  "status"                   TEXT DEFAULT 'pending',  -- 'pending' | 'investigating' | 'resolved' | 'dismissed'
  "priority"                 TEXT DEFAULT 'normal',  -- 'low' | 'normal' | 'high' | 'urgent'
  -- Resolution
  "admin_user_id"            INTEGER,  -- who handled it
  "resolution_notes"         TEXT,
  "resolution_action"        TEXT,
    -- 'no_action' | 'warning' | 'temp_suspension' | 'perm_ban' | 'rtr_revoked'
  "resolved_at"              TIMESTAMP,
  -- Linkage
  "submission_id"            INTEGER REFERENCES "CandidateSubmission"("id"),
  "job_id"                   INTEGER REFERENCES "JobPosting"("id"),
  -- Timestamps
  "created_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_recruiter_status ON "RecruiterReport" ("recruiter_user_id", "status");
CREATE INDEX IF NOT EXISTS idx_report_status_priority ON "RecruiterReport" ("status", "priority");

-- ───────────────────────────────────────────────────────────────────
-- 10. RecruiterReviewDispute — recruiter's challenge to a negative review
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RecruiterReviewDispute" (
  "id"                       SERIAL PRIMARY KEY,
  "review_id"                INTEGER NOT NULL REFERENCES "RecruiterReview"("id") ON DELETE CASCADE,
  "recruiter_user_id"        INTEGER NOT NULL,  -- who is disputing (must be the reviewed recruiter)
  -- Dispute grounds
  "reason_category"          TEXT NOT NULL,
    -- 'false_claim' | 'wrong_recruiter' | 'vindictive' | 'factually_incorrect' | 'policy_violation' | 'other'
  "explanation"              TEXT NOT NULL,  -- min 100 chars (enforced in app)
  -- Evidence
  "evidence_urls"            TEXT,  -- JSON array of doc links
  -- Status
  "status"                   TEXT DEFAULT 'pending',
    -- 'pending' | 'investigating' | 'upheld' | 'removed' | 'annotated' | 'dismissed'
  "admin_user_id"            INTEGER,  -- who handled it
  "admin_notes"              TEXT,
  "resolution"               TEXT,
    -- 'review_kept' | 'review_removed' | 'review_annotated' | 'recruiter_warned'
  "admin_annotation"         TEXT,  -- shown publicly under the review IF dispute is partially upheld
  -- Timestamps
  "created_at"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "resolved_at"              TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispute_review_unique
  ON "RecruiterReviewDispute" ("review_id");
CREATE INDEX IF NOT EXISTS idx_dispute_status ON "RecruiterReviewDispute" ("status");

-- ───────────────────────────────────────────────────────────────────
-- PlatformSetting seed — default per-task credit costs
-- (configurable by superadmin via /superadmin/settings later)
-- ───────────────────────────────────────────────────────────────────
INSERT INTO "PlatformSetting" ("setting_key", "setting_value", "updated_at")
VALUES
  ('credit_cost.unlock_candidate', '1', CURRENT_TIMESTAMP),
  ('credit_cost.view_credentials', '1', CURRENT_TIMESTAMP),
  ('credit_cost.view_references', '1', CURRENT_TIMESTAMP),
  ('credit_cost.view_resume', '1', CURRENT_TIMESTAMP),
  ('credit_cost.send_share_request', '0', CURRENT_TIMESTAMP),
  ('credit_cost.view_full_packet', '3', CURRENT_TIMESTAMP),
  ('credit_cost.reveal_email', '2', CURRENT_TIMESTAMP),
  ('credit_cost.reveal_phone', '2', CURRENT_TIMESTAMP),
  ('credit_cost.submit_candidate', '2', CURRENT_TIMESTAMP),
  ('credit_cost.send_skill_checklist', '2', CURRENT_TIMESTAMP)
ON CONFLICT ("setting_key") DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- Verification queries — run these after applying the migration to confirm
-- ───────────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables WHERE table_name IN
--   ('CandidateRecord', 'CandidateContactInfo', 'JobPosting',
--    'CandidateSubmission', 'CandidateOwnershipWindow',
--    'CandidateContactReveal', 'RecruiterReputationScore',
--    'RecruiterReview', 'RecruiterReport', 'RecruiterReviewDispute')
-- ORDER BY table_name;
-- -- Should return 10 rows.
--
-- SELECT setting_key, setting_value FROM PlatformSetting
--   WHERE setting_key LIKE 'credit_cost.%' ORDER BY setting_key;
-- -- Should return 10 rows.

-- ───────────────────────────────────────────────────────────────────
-- ROLLBACK:
-- DROP TABLE IF EXISTS "RecruiterReviewDispute";
-- DROP TABLE IF EXISTS "RecruiterReport";
-- DROP TABLE IF EXISTS "RecruiterReview";
-- DROP TABLE IF EXISTS "RecruiterReputationScore";
-- DROP TABLE IF EXISTS "CandidateContactReveal";
-- DROP TABLE IF EXISTS "CandidateOwnershipWindow";
-- DROP TABLE IF EXISTS "CandidateSubmission";
-- DROP TABLE IF EXISTS "JobPosting";
-- DROP TABLE IF EXISTS "CandidateContactInfo";
-- DROP TABLE IF EXISTS "CandidateRecord";
-- -- Do NOT delete the PlatformSetting rows — they're just config.
-- ───────────────────────────────────────────────────────────────────
