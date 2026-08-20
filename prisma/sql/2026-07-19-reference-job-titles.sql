-- ───────────────────────────────────────────────────────────────────
-- Migration: Add job title fields to CandidateReference table
-- Date: 2026-07-19
-- Purpose: Add manager_job_title and candidate_job_title columns
--
-- This is 100% ADDITIVE — no existing data is touched.
-- Run this in Supabase SQL Editor.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE "CandidateReference"
  ADD COLUMN IF NOT EXISTS manager_job_title TEXT,
  ADD COLUMN IF NOT EXISTS candidate_job_title TEXT;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'CandidateReference'
  AND column_name IN ('manager_job_title', 'candidate_job_title');

-- ───────────────────────────────────────────────────────────────────
-- ROLLBACK:
-- ALTER TABLE "CandidateReference" DROP COLUMN IF EXISTS manager_job_title;
-- ALTER TABLE "CandidateReference" DROP COLUMN IF EXISTS candidate_job_title;
-- ───────────────────────────────────────────────────────────────────
