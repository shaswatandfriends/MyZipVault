-- ════════════════════════════════════════════════════════════════════
-- Phase 3.1 — RecruiterInvite + Message tables
-- Date: 2026-09-11
--
-- Purpose:
--   Phase 3 of EXECUTION-PLAN: replaces the "Send Request" primary action
--   with a simpler "Invite Candidate" flow with 72-hr cooldown.
--
--   Also adds Phase 3.4 in-app messaging (candidate ↔ recruiter chat).
--
-- Schema:
--   1. RecruiterInvite — one row per recruiter → candidate invitation
--      - recruiter_user_id (FK User)
--      - candidate_email (string — pre-account-creation lookup key)
--      - candidate_user_id (nullable FK User — set when candidate accepts)
--      - job_id (nullable FK JobPosting — invite is tied to a specific job)
--      - email_subject + email_body (the sent content, for history)
--      - status: sent | accepted | denied | expired
--      - sent_at, accepted_at, denied_at, expires_at
--      - Unique index on (candidate_email, sent_at) for cooldown query
--
--   2. Message — chat messages between candidate and recruiter
--      - invite_id (FK RecruiterInvite — chat is scoped to invite)
--      - sender_user_id (FK User)
--      - body (text)
--      - sent_at, read_at
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. RecruiterInvite ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RecruiterInvite" (
  "id"                 SERIAL PRIMARY KEY,
  "public_id"          UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "recruiter_user_id"  INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "candidate_email"    TEXT NOT NULL,
  "candidate_user_id"  INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "job_id"             INTEGER REFERENCES "JobPosting"("id") ON DELETE SET NULL,
  "email_subject"      TEXT NOT NULL,
  "email_body"         TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'sent',  -- sent | accepted | denied | expired
  "sent_at"            TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "accepted_at"        TIMESTAMP(3),
  "denied_at"          TIMESTAMP(3),
  "expires_at"         TIMESTAMP(3)  -- for the 72-hr cooldown + invite expiration
);

-- Index for 72-hr cooldown lookup: "any invite to this email in last 72 hrs?"
CREATE INDEX IF NOT EXISTS "RecruiterInvite_candidate_email_sent_at_idx"
  ON "RecruiterInvite"("candidate_email", "sent_at" DESC);

-- Index for candidate's "Connections" page: list invites by status
CREATE INDEX IF NOT EXISTS "RecruiterInvite_candidate_user_id_status_idx"
  ON "RecruiterInvite"("candidate_user_id", "status");

-- Index for recruiter's outgoing invites
CREATE INDEX IF NOT EXISTS "RecruiterInvite_recruiter_user_id_idx"
  ON "RecruiterInvite"("recruiter_user_id");

-- ─── 2. Message (in-app chat) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Message" (
  "id"                SERIAL PRIMARY KEY,
  "invite_id"         INTEGER NOT NULL REFERENCES "RecruiterInvite"("id") ON DELETE CASCADE,
  "sender_user_id"    INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body"              TEXT NOT NULL,
  "sent_at"           TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "read_at"           TIMESTAMP(3)
);

-- Index for chat history fetch (DESC by sent_at)
CREATE INDEX IF NOT EXISTS "Message_invite_id_sent_at_idx"
  ON "Message"("invite_id", "sent_at" DESC);

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS "Message_invite_id_read_at_idx"
  ON "Message"("invite_id")
  WHERE "read_at" IS NULL;

COMMIT;

-- Verification
SELECT
  (SELECT COUNT(*) FROM "RecruiterInvite") AS total_invites,
  (SELECT COUNT(*) FROM "Message")         AS total_messages;
