-- ════════════════════════════════════════════════════════════════════
-- Add middle_name to CandidateProfile (matches CandidateRecord)
-- Date: 2026-09-17
--
-- Makes name fields uniform across the platform:
--   - CandidateRecord (CSV import): first_name, middle_name, last_name
--   - CandidateProfile (onboarding): first_name, middle_name, last_name
--   - User: first_name, last_name (no middle_name — kept minimal)
--
-- Run in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "CandidateProfile"
  ADD COLUMN IF NOT EXISTS middle_name TEXT;

COMMIT;

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'CandidateProfile'
  AND column_name IN ('first_name', 'middle_name', 'last_name')
ORDER BY ordinal_position;
