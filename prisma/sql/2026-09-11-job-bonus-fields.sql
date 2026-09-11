-- ════════════════════════════════════════════════════════════════════
-- Phase 2.3 — JobPosting: add is_bonus + bonus_amount
-- Date: 2026-09-11
--
-- Purpose:
--   Enables the Phase 2.4 "Bonus" badge on job cards (e.g., "⚡ Bonus: +5%").
--   Also supports the IronBase-inspired incentive layer from EXECUTION-PLAN
--   Phase 2 (70% standard → 75% on urgent jobs).
--
-- Schema change:
--   ALTER TABLE "JobPosting"
--     ADD COLUMN is_bonus      BOOLEAN NOT NULL DEFAULT FALSE
--     ADD COLUMN bonus_amount  DECIMAL(10,2)  -- nullable, only set when is_bonus=TRUE
--
-- Backward compatible:
--   ✅ is_bonus defaults to FALSE — existing jobs are non-bonus
--   ✅ bonus_amount is nullable — only populated for bonus jobs
--   ✅ No FK changes, no constraints to add
--
-- Prisma schema:
--   Update prisma/schema.prisma → JobPosting model:
--     is_bonus     Boolean       @default(false)
--     bonus_amount Decimal?      @db.Decimal(10, 2)
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "JobPosting"
  ADD COLUMN IF NOT EXISTS "is_bonus"     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "bonus_amount" DECIMAL(10,2);

-- Index for fast filtering of bonus jobs in marketplace queries
CREATE INDEX IF NOT EXISTS "JobPosting_is_bonus_idx"
  ON "JobPosting"("is_bonus")
  WHERE "is_bonus" = TRUE AND "status" = 'open';

COMMIT;

-- Verification
SELECT
  COUNT(*) FILTER (WHERE "is_bonus" = TRUE)  AS bonus_jobs,
  COUNT(*) FILTER (WHERE "is_bonus" = FALSE) AS regular_jobs,
  COUNT(*)                                    AS total_jobs
FROM "JobPosting";
