-- ════════════════════════════════════════════════════════════════════
-- Saved Candidate Pools — Additive migration
-- Date: 2026-06-18
--
-- Purpose:
--   Creates 2 new tables for the Saved Candidate Pools feature.
--   Recruiters organize candidates into named groups ("playlists").
--
-- Safety:
--   ✅ 100% ADDITIVE — new tables only, no existing tables modified
--   ✅ Rollback: DROP TABLE "CandidatePoolMember", "CandidatePool";
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "CandidatePool" (
  "id"                SERIAL PRIMARY KEY,
  "name"              VARCHAR(255) NOT NULL,
  "description"       TEXT,
  "recruiter_user_id" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "organization_id"   INTEGER NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "color"             VARCHAR(20) DEFAULT '#059669',
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CandidatePool_recruiter_org_idx"
  ON "CandidatePool"("recruiter_user_id", "organization_id");

CREATE TABLE IF NOT EXISTS "CandidatePoolMember" (
  "id"                SERIAL PRIMARY KEY,
  "pool_id"           INTEGER NOT NULL REFERENCES "CandidatePool"("id") ON DELETE CASCADE,
  "candidate_user_id" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "notes"             TEXT,
  "added_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CandidatePoolMember_pool_idx"
  ON "CandidatePoolMember"("pool_id");

CREATE INDEX IF NOT EXISTS "CandidatePoolMember_candidate_idx"
  ON "CandidatePoolMember"("candidate_user_id");

-- Prevent duplicate entries (same candidate in same pool twice)
CREATE UNIQUE INDEX IF NOT EXISTS "CandidatePoolMember_pool_candidate_unique"
  ON "CandidatePoolMember"("pool_id", "candidate_user_id");

COMMIT;
