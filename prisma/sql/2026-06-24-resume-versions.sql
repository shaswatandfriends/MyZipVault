-- ════════════════════════════════════════════════════════════════════
-- Resume Versions — Additive migration
-- Date: 2026-06-24
--
-- Adds version_name, is_active, template_id, ats_score, updated_at
-- to the Resume table for the Resume Hub feature.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- Add new columns (all nullable or have defaults — safe for existing rows)
ALTER TABLE "Resume"
  ADD COLUMN IF NOT EXISTS "version_name" VARCHAR DEFAULT 'Master Resume',
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "template_id" VARCHAR,
  ADD COLUMN IF NOT EXISTS "ats_score" INTEGER,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Mark existing resumes as active with default version name
UPDATE "Resume"
SET "version_name" = 'Master Resume',
    "is_active" = true,
    "updated_at" = "created_at"
WHERE "version_name" IS NULL OR "version_name" = '';

COMMIT;
