-- ════════════════════════════════════════════════════════════════════
-- Org Settings Phase 3: date_format + permission toggles
-- Date: 2026-06-21
--
-- Adds:
--   1. date_format — org-wide date format preference (default: 'MM/DD/YYYY')
--   2. show_billing_to_recruiters — admin toggle (default: false)
--   3. allow_credit_requests — admin toggle (default: false)
--   4. allow_recruiter_csv_export — admin toggle (default: true)
--
-- Safety: 100% ADDITIVE, all nullable with safe defaults
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "date_format" VARCHAR(20) DEFAULT 'MM/DD/YYYY';

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "show_billing_to_recruiters" BOOLEAN DEFAULT false;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "allow_credit_requests" BOOLEAN DEFAULT false;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "allow_recruiter_csv_export" BOOLEAN DEFAULT true;

COMMIT;
