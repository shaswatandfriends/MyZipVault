-- ─────────────────────────────────────────────────────────────────────
-- Migration: Add missing columns surfaced by audit-2 strict TS check
-- Date: 2026-08-23
-- Purpose: Code references columns that didn't exist in schema.prisma.
--          Adding them here so the Prisma client + runtime DB match.
-- Safety:  100% additive — uses ADD COLUMN IF NOT EXISTS.
-- ROLLBACK:
--   ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "is_deleted";
--   ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "is_platform_candidate";
--   ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "is_no_longer_interested";
--   ALTER TABLE "CandidateChecklistResponse" DROP COLUMN IF EXISTS "personal_info_collected";
-- ─────────────────────────────────────────────────────────────────────

-- RecruiterLead: soft-delete + platform candidate tracking
ALTER TABLE "RecruiterLead" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecruiterLead" ADD COLUMN IF NOT EXISTS "is_platform_candidate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecruiterLead" ADD COLUMN IF NOT EXISTS "is_no_longer_interested" BOOLEAN NOT NULL DEFAULT false;

-- CandidateChecklistResponse: tracks whether personal info was collected
ALTER TABLE "CandidateChecklistResponse" ADD COLUMN IF NOT EXISTS "personal_info_collected" BOOLEAN NOT NULL DEFAULT false;

-- CallSchedule: schedule_type + scheduled_year + remark (from 2026-08-23-callschedule-additional-columns.sql)
-- (Already in the separate migration file — not duplicated here)
