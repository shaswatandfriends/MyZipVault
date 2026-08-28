-- ───────────────────────────────────────────────────────────────────
-- Migration: Marketplace Phase 2c — Make recruiter_user_id nullable
-- Date: 2026-08-19
-- Purpose: Allow candidate self-submissions (no recruiter) on
--   CandidateSubmission. When a candidate applies directly to a public
--   job (Indeed-style), there's no recruiter involved — the platform
--   keeps 100% of the placement fee.
--
-- This is ADDITIVE — only changes nullability of one column.
-- Existing rows are NOT affected.
-- Run this in Supabase SQL Editor.
-- ───────────────────────────────────────────────────────────────────

-- Make recruiter_user_id nullable (was NOT NULL)
ALTER TABLE "CandidateSubmission" ALTER COLUMN "recruiter_user_id" DROP NOT NULL;

-- Add a submission_type column to distinguish recruiter vs self-apply
ALTER TABLE "CandidateSubmission"
  ADD COLUMN IF NOT EXISTS "submission_type" TEXT NOT NULL DEFAULT 'recruiter';
  -- 'recruiter' (recruiter submitted, 70/30 split)
  -- 'self_apply' (candidate applied directly, 100% to platform)

-- Backfill existing rows (all current submissions are recruiter-submitted)
UPDATE "CandidateSubmission" SET "submission_type" = 'recruiter' WHERE "submission_type" IS NULL OR "submission_type" = '';

-- Add an index for filtering by submission_type
CREATE INDEX IF NOT EXISTS idx_candidate_submission_type ON "CandidateSubmission" ("submission_type");

-- Verify
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'CandidateSubmission'
  AND column_name IN ('recruiter_user_id', 'submission_type')
ORDER BY column_name;

-- ───────────────────────────────────────────────────────────────────
-- ROLLBACK:
-- ALTER TABLE "CandidateSubmission" ALTER COLUMN "recruiter_user_id" SET NOT NULL;
-- ALTER TABLE "CandidateSubmission" DROP COLUMN IF EXISTS "submission_type";
-- ───────────────────────────────────────────────────────────────────
