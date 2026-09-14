-- ════════════════════════════════════════════════════════════════════
-- Phase 6.4 — Onboarding tour completion flag
-- Date: 2026-09-11
--
-- Purpose:
--   Persists the "candidate/recruiter has seen the onboarding tour" flag
--   so the tour auto-starts only on the FIRST dashboard load.
--   "Take a tour" button in sidebar ignores the flag and re-runs the tour.
--
-- Schema change:
--   ALTER TABLE "User"
--     ADD COLUMN onboarding_tour_completed_at  TIMESTAMP(3)
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "onboarding_tour_completed_at" TIMESTAMP(3);

COMMIT;

-- Verification
SELECT
  COUNT(*) FILTER (WHERE "onboarding_tour_completed_at" IS NOT NULL) AS completed_tour,
  COUNT(*) FILTER (WHERE "onboarding_tour_completed_at" IS NULL)     AS pending_tour,
  COUNT(*)                                                            AS total_users
FROM "User";
