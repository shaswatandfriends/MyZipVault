-- ───────────────────────────────────────────────────────────────────
-- Migration: Add requested_documents column to ShareRequest table
-- Date: 2026-07-13
-- Purpose: Store specific credential names requested by recruiter
--          (e.g. ["BLS (Basic Life Support)", "ACLS (Advanced Cardiovascular Life Support)"])
--          so the candidate's vault can be auto-matched.
--
-- This is 100% ADDITIVE — no existing data is touched.
-- The column is nullable: null = legacy request, empty string/array = no specific docs.
--
-- Run this in Supabase SQL Editor.
-- After running, tell Super Z to push the Prisma schema update.
-- ───────────────────────────────────────────────────────────────────

-- Add the column (nullable, additive)
ALTER TABLE "ShareRequest"
  ADD COLUMN IF NOT EXISTS requested_documents TEXT;

-- Verify it was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ShareRequest'
  AND column_name = 'requested_documents';

-- ───────────────────────────────────────────────────────────────────
-- ROLLBACK (if needed):
--
-- ALTER TABLE "ShareRequest" DROP COLUMN IF EXISTS requested_documents;
-- ───────────────────────────────────────────────────────────────────
