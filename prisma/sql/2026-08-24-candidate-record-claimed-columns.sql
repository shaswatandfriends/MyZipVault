-- ─────────────────────────────────────────────────────────────────────
-- Migration: Add claimed_by_user_id + claimed_at to CandidateRecord
-- Date: 2026-08-24
-- Purpose: schema.prisma has claimed_by_user_id and claimed_at on
--          CandidateRecord but the prod DB doesn't have them. Every
--          query on CandidateRecord via Prisma will fail with 500
--          because Prisma tries to select these columns.
-- Safety:  100% additive — uses ADD COLUMN IF NOT EXISTS.
-- ROLLBACK:
--   ALTER TABLE "CandidateRecord" DROP COLUMN IF EXISTS "claimed_by_user_id";
--   ALTER TABLE "CandidateRecord" DROP COLUMN IF EXISTS "claimed_at";
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE "CandidateRecord"
  ADD COLUMN IF NOT EXISTS "claimed_by_user_id" INTEGER;

ALTER TABLE "CandidateRecord"
  ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMP;

-- Index for fast lookup by claimed user
CREATE INDEX IF NOT EXISTS "idx_candidate_record_claimed_by"
  ON "CandidateRecord" ("claimed_by_user_id")
  WHERE "claimed_by_user_id" IS NOT NULL;
