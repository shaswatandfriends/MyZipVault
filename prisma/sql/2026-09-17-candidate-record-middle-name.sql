-- ════════════════════════════════════════════════════════════════════
-- Add middle_name column to CandidateRecord
-- Date: 2026-09-17
--
-- The candidate import now supports 3 separate name columns:
--   First Name, Middle Name, Last Name
--
-- This migration adds the middle_name column to store the middle name
-- when provided. Existing records will have middle_name = NULL.
--
-- Run in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE "CandidateRecord"
  ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Verification
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'CandidateRecord'
  AND column_name IN ('first_name', 'middle_name', 'last_name')
ORDER BY ordinal_position;
