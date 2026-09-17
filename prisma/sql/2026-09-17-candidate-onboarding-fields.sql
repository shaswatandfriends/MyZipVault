-- ════════════════════════════════════════════════════════════════════
-- Add onboarding fields to CandidateProfile
-- Date: 2026-09-17
--
-- New fields for the first-login onboarding form:
--   - job_title           (e.g. "Registered Nurse", "Travel Nurse")
--   - specialty           (e.g. "ICU", "ER", "Labor & Delivery")
--   - referral_source     ("Where did you hear about us?" — internal audit)
--   - onboarding_completed_at (timestamp — null until onboarding is done)
--
-- Existing fields already in CandidateProfile (no changes needed):
--   - first_name, last_name, phone (from signup)
--   - city, state, zip_code (Phase 4.1)
--   - years_experience_total, years_experience_specialty (Phase 4.1)
--   - ssn_encrypted (Phase 4.1)
--
-- Run in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "CandidateProfile"
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMIT;

-- Verification
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'CandidateProfile'
  AND column_name IN ('job_title', 'specialty', 'referral_source', 'onboarding_completed_at')
ORDER BY ordinal_position;
