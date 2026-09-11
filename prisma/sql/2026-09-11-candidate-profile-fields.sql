-- ════════════════════════════════════════════════════════════════════
-- Phase 4.1 — Candidate profile fields (with SSN encryption)
-- Date: 2026-09-11
--
-- Purpose:
--   Adds candidate-fillable fields needed for the redesigned checklist UI.
--   Reference: https://healthcareskillschecklist.com/checklist/rn
--
--   Per EXECUTION-PLAN: these fields are stored permanently on the
--   candidate profile (editable later), NOT per-checklist response.
--
--   SSN is stored AES-256-encrypted at rest (src/lib/encryption.ts).
--
-- Schema change:
--   ALTER TABLE "CandidateProfile"
--     ADD COLUMN ssn_encrypted              TEXT,              -- AES-256-CBC ciphertext
--     ADD COLUMN city                       TEXT,
--     ADD COLUMN state                      CHAR(2),           -- 2-char US state code
--     ADD COLUMN years_experience_total     INTEGER,
--     ADD COLUMN years_experience_specialty INTEGER,
--     ADD COLUMN zip_code                   TEXT
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "CandidateProfile"
  ADD COLUMN IF NOT EXISTS "ssn_encrypted"              TEXT,
  ADD COLUMN IF NOT EXISTS "city"                       TEXT,
  ADD COLUMN IF NOT EXISTS "state"                      CHAR(2),
  ADD COLUMN IF NOT EXISTS "years_experience_total"      INTEGER,
  ADD COLUMN IF NOT EXISTS "years_experience_specialty" INTEGER,
  ADD COLUMN IF NOT EXISTS "zip_code"                   TEXT;

-- Index for state-based candidate filtering (recruiter search)
CREATE INDEX IF NOT EXISTS "CandidateProfile_state_idx"
  ON "CandidateProfile"("state")
  WHERE "state" IS NOT NULL;

COMMIT;

-- Verification
SELECT
  COUNT(*) FILTER (WHERE "city" IS NOT NULL)                       AS with_city,
  COUNT(*) FILTER (WHERE "state" IS NOT NULL)                      AS with_state,
  COUNT(*) FILTER (WHERE "ssn_encrypted" IS NOT NULL)              AS with_ssn,
  COUNT(*) FILTER (WHERE "years_experience_total" IS NOT NULL)     AS with_total_exp,
  COUNT(*)                                                          AS total_profiles
FROM "CandidateProfile";
