-- ─────────────────────────────────────────────────────────────────────
-- Migration: Add schedule_type, scheduled_year, remark columns to CallSchedule
-- Date: 2026-08-23
-- Purpose: Code in /api/calendar/leads/route.ts references schedule_type and
--          scheduled_year columns that didn't exist in schema.prisma. They
--          were silently passing because typescript.ignoreBuildErrors=true.
--          With TS strict mode on (audit-1 fix), these need to exist.
-- Safety:  100% additive — uses ADD COLUMN IF NOT EXISTS.
-- ROLLBACK:
--   ALTER TABLE "CallSchedule" DROP COLUMN IF EXISTS "schedule_type";
--   ALTER TABLE "CallSchedule" DROP COLUMN IF EXISTS "scheduled_year";
--   ALTER TABLE "CallSchedule" DROP COLUMN IF EXISTS "remark";
-- ─────────────────────────────────────────────────────────────────────

-- Add schedule_type (null for legacy rows that don't have it)
ALTER TABLE "CallSchedule" ADD COLUMN IF NOT EXISTS "schedule_type" TEXT;

-- Add scheduled_year (null for legacy rows / specific-date rows)
ALTER TABLE "CallSchedule" ADD COLUMN IF NOT EXISTS "scheduled_year" INTEGER;

-- Add remark (the code passes it but it wasn't in schema)
ALTER TABLE "CallSchedule" ADD COLUMN IF NOT EXISTS "remark" TEXT;

-- Backfill schedule_type from existing data: any row with scheduled_date is
-- a 'specific_date' row; any row with scheduled_month is 'month_range'.
UPDATE "CallSchedule"
SET "schedule_type" = 'specific_date'
WHERE "schedule_type" IS NULL AND "scheduled_date" IS NOT NULL;

UPDATE "CallSchedule"
SET "schedule_type" = 'month_range'
WHERE "schedule_type" IS NULL AND "scheduled_month" IS NOT NULL;

-- Index for fast lookup by schedule_type
CREATE INDEX IF NOT EXISTS "idx_callschedule_schedule_type"
  ON "CallSchedule" ("schedule_type")
  WHERE "schedule_type" IS NOT NULL;
