-- ════════════════════════════════════════════════════════════════════
-- BOB (Book of Business) — Phase 1: Data Model Migration
-- Date: 2026-06-20
--
-- Purpose:
--   Extends the existing RecruiterLead model to support the full BOB
--   workflow: 12 candidate statuses, activity timeline, tags, blacklist,
--   re-engagement prompts, last_activity tracking.
--
-- Strategy:
--   ✅ 100% ADDITIVE — only adds columns and creates new tables
--   ✅ All new columns are NULLABLE or have safe defaults
--   ✅ No existing data is modified or deleted
--   ✅ Rollback: drop columns + tables (see end of file)
--
-- What this migration adds:
--   1. New columns on RecruiterLead:
--      - candidate_user_id (FK → User) — links lead to platform candidate
--      - tag (hot/warm/cold/inactive) — auto-updated by status engine
--      - last_activity_at — for 30-day inactivity rule
--      - last_activity_type — what the last activity was
--      - blacklist_reason — text reason when blacklisted
--      - blacklisted_at — when blacklisted
--      - blacklisted_by_user_id — who blacklisted
--      - rtr_denial_count — tracks RTR denials (5 = auto not_interested)
--      - next_action — recruiter's next planned action
--      - next_action_at — when to do it
--      - notes — free-text notes (quick version; full notes in activity log)
--
--   2. New table: RecruiterLeadActivity (audit trail)
--      - One row per interaction (RTR sent, doc uploaded, status changed, etc.)
--      - Indexed on lead_id + created_at for fast timeline queries
--
--   3. Adds candidate_lead_id to VaultSignDocument (links VaultSign docs to leads)
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Add new columns to RecruiterLead ───────────────────────────
-- All nullable or with safe defaults — no existing rows are broken.

-- Link lead to a platform User (candidate) once they sign up
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "candidate_user_id" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;

-- Tag system (separate from pipeline_stage)
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "tag" VARCHAR(20) DEFAULT 'cold';
  -- Values: hot | warm | cold | inactive
  -- Auto-updated by status engine based on last_activity_at:
  --   hot      = activity in last 7 days
  --   warm     = activity in last 8-14 days
  --   cold     = no activity in 15-30 days
  --   inactive = no activity 30+ days (also sets pipeline_stage = 'inactive')

-- Last activity tracking (for 30-day inactivity rule)
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "last_activity_type" VARCHAR(100);
  -- Examples: 'rtr_sent', 'rtr_signed', 'doc_uploaded', 'status_changed',
  --           'note_added', 'interview_scheduled', 'offer_sent', 'offer_signed',
  --           'call_logged', 'candidate_created'

-- Blacklist tracking
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "blacklist_reason" TEXT;
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "blacklisted_at" TIMESTAMP(3);
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "blacklisted_by_user_id" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;

-- RTR denial tracking (5 denials → auto not_interested)
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "rtr_denial_count" INTEGER DEFAULT 0;

-- Next action planning (recruiter-facing)
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "next_action" VARCHAR(255);
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "next_action_at" TIMESTAMP(3);

-- Free-text notes (full history lives in RecruiterLeadActivity)
ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Backfill last_activity_at for existing rows using updated_at
UPDATE "RecruiterLead"
SET "last_activity_at" = "updated_at"
WHERE "last_activity_at" IS NULL;

-- Backfill tag for existing rows based on last_activity_at
UPDATE "RecruiterLead"
SET "tag" = CASE
  WHEN "last_activity_at" >= NOW() - INTERVAL '7 days' THEN 'hot'
  WHEN "last_activity_at" >= NOW() - INTERVAL '14 days' THEN 'warm'
  WHEN "last_activity_at" >= NOW() - INTERVAL '30 days' THEN 'cold'
  ELSE 'inactive'
END;

-- Indexes for BOB queries (list/filter/sort)
CREATE INDEX IF NOT EXISTS "RecruiterLead_recruiter_stage_idx"
  ON "RecruiterLead"("recruiter_user_id", "pipeline_stage");
CREATE INDEX IF NOT EXISTS "RecruiterLead_org_stage_idx"
  ON "RecruiterLead"("organization_id", "pipeline_stage");
CREATE INDEX IF NOT EXISTS "RecruiterLead_last_activity_idx"
  ON "RecruiterLead"("last_activity_at");
CREATE INDEX IF NOT EXISTS "RecruiterLead_tag_idx"
  ON "RecruiterLead"("tag");
CREATE INDEX IF NOT EXISTS "RecruiterLead_candidate_user_idx"
  ON "RecruiterLead"("candidate_user_id");


-- ─── 2. Create RecruiterLeadActivity (audit trail) ─────────────────
-- One row per interaction. Powers the Activity Timeline tab in candidate profile.

CREATE TABLE IF NOT EXISTS "RecruiterLeadActivity" (
  "id"                SERIAL PRIMARY KEY,
  "lead_id"           INTEGER NOT NULL REFERENCES "RecruiterLead"("id") ON DELETE CASCADE,
  "activity_type"     VARCHAR(100) NOT NULL,
    -- Examples: 'lead_created', 'rtr_sent', 'rtr_signed', 'rtr_denied',
    --           'doc_requested', 'doc_uploaded', 'doc_shared', 'doc_denied',
    --           'status_changed', 'tag_changed', 'note_added', 'call_logged',
    --           'interview_scheduled', 'offer_sent', 'offer_signed',
    --           'offer_accepted', 'onboarding_started', 'assignment_started',
    --           'blacklisted', 'reactivated', 'moved_to_company_pool',
    --           'claimed_from_company_pool'
  "description"       TEXT NOT NULL,
    -- Human-readable summary: "RTR sent via VaultSign — Right to Represent Agreement"
  "actor_user_id"     INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
    -- Who performed the action (recruiter, admin, or NULL for system/candidate)
  "actor_type"        VARCHAR(20) DEFAULT 'recruiter',
    -- recruiter | admin | candidate | system
  "metadata"          JSONB DEFAULT '{}'::jsonb,
    -- Structured data: {document_id, document_name, old_status, new_status, etc.}
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "RecruiterLeadActivity_lead_created_idx"
  ON "RecruiterLeadActivity"("lead_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "RecruiterLeadActivity_actor_idx"
  ON "RecruiterLeadActivity"("actor_user_id");


-- ─── 3. Link VaultSignDocument → RecruiterLead ─────────────────────
-- Lets us show "all VaultSign docs sent to this candidate" in their profile.

ALTER TABLE "VaultSignDocument"
  ADD COLUMN IF NOT EXISTS "candidate_lead_id" INTEGER REFERENCES "RecruiterLead"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "VaultSignDocument_candidate_lead_idx"
  ON "VaultSignDocument"("candidate_lead_id");


-- ─── 4. Seed initial activity for existing leads (backfill) ─────────
-- Creates one 'lead_created' activity for each existing lead so the timeline
-- isn't empty for legacy leads.

INSERT INTO "RecruiterLeadActivity" ("lead_id", "activity_type", "description", "actor_user_id", "actor_type", "created_at")
SELECT
  "id",
  'lead_created',
  'Lead imported from existing data',
  "recruiter_user_id",
  'recruiter',
  "created_at"
FROM "RecruiterLead"
WHERE NOT EXISTS (
  SELECT 1 FROM "RecruiterLeadActivity"
  WHERE "lead_id" = "RecruiterLead"."id"
    AND "activity_type" = 'lead_created'
);


COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (run only if something goes wrong):
--
-- BEGIN;
-- DROP TABLE IF EXISTS "RecruiterLeadActivity";
-- ALTER TABLE "VaultSignDocument" DROP COLUMN IF EXISTS "candidate_lead_id";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "candidate_user_id";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "tag";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "last_activity_at";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "last_activity_type";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "blacklist_reason";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "blacklisted_at";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "blacklisted_by_user_id";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "rtr_denial_count";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "next_action";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "next_action_at";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "notes";
-- COMMIT;
-- ════════════════════════════════════════════════════════════════════
