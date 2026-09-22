-- ════════════════════════════════════════════════════════════════════
-- Recruiter booking table — candidates book calls with recruiters
-- Date: 2026-09-22
--
-- Allows candidates to book a time slot with a recruiter from their
-- public profile page. Only Sat/Sun slots are available.
--
-- Run in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "RecruiterBooking" (
  id                SERIAL PRIMARY KEY,
  recruiter_user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  candidate_user_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
  candidate_name    TEXT,
  candidate_email   TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 30,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled | completed
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_recruiter_booking_recruiter"
  ON "RecruiterBooking"(recruiter_user_id, scheduled_at);

CREATE INDEX IF NOT EXISTS "idx_recruiter_booking_candidate"
  ON "RecruiterBooking"(candidate_user_id);

CREATE INDEX IF NOT EXISTS "idx_recruiter_booking_status"
  ON "RecruiterBooking"(status, scheduled_at);

COMMIT;

SELECT 'RecruiterBooking' AS table_name, COUNT(*) AS column_count
FROM information_schema.columns WHERE table_name = 'RecruiterBooking';
