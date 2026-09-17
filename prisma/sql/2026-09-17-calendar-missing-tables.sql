-- ════════════════════════════════════════════════════════════════════
-- Create missing tables for calendar subsystem
-- Date: 2026-09-17
--
-- The calendar routes and 2 cron jobs (calendar-midnight, calendar-reminders)
-- reference two tables that were never created in the database:
--   1. CandidateCalendarSetting — candidate calendar preferences + quick override
--   2. FollowUpReminder         — scheduled follow-up reminders for recruiter leads
--
-- After running this migration:
--   - calendar-midnight cron will succeed (no longer 500)
--   - calendar-reminders cron will succeed (no longer 500)
--   - /api/calendar/settings GET/PUT will work for candidates
--   - /api/calendar/leads POST/GET/DELETE will work for recruiters
--   - /api/calendar/schedules POST/GET will work for recruiters
--   - /api/calendar/leads/[id]/log POST will work for recruiters
--
-- Run in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. CandidateCalendarSetting
--    Stores candidate calendar preferences (notice hours, response deadlines,
--    availability, quick override). One row per user.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CandidateCalendarSetting" (
  id                        SERIAL PRIMARY KEY,
  user_id                   INTEGER NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  minimum_notice_hours      INTEGER,                       -- e.g. 24 = recruiter must give 24h notice
  shift_duration_preference TEXT,                          -- '8h' | '12h' | 'flexible'
  response_deadline_hours   INTEGER,                       -- e.g. 48 = candidate must respond within 48h
  preferred_facilities      TEXT,                          -- JSON array stored as text
  availability_status       TEXT DEFAULT 'open',           -- 'open' | 'limited' | 'closed'
  quick_override_active     BOOLEAN NOT NULL DEFAULT FALSE,-- candidate temporarily bypasses calendar rules
  quick_override_date       TIMESTAMPTZ,                   -- when the override was set (reset by midnight cron)
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_candidate_calendar_setting_user"
  ON "CandidateCalendarSetting"(user_id);

CREATE INDEX IF NOT EXISTS "idx_candidate_calendar_setting_quick_override"
  ON "CandidateCalendarSetting"(quick_override_active, quick_override_date);

-- ─────────────────────────────────────────────────────────────────────
-- 2. FollowUpReminder
--    Scheduled reminders for recruiters to follow up with leads.
--    Created when a CallSchedule is made (4 reminders for specific_date,
--    1 daily reminder for month_range). Cron processes them when due.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FollowUpReminder" (
  id                  SERIAL PRIMARY KEY,
  lead_id             INTEGER NOT NULL REFERENCES "RecruiterLead"(id) ON DELETE CASCADE,
  call_schedule_id    INTEGER REFERENCES "CallSchedule"(id) ON DELETE SET NULL,
  recruiter_user_id   INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  reminder_type       TEXT NOT NULL,                       -- 'day_before' | 'day_of' | 'thirty_min_after' | 'day_after_no_update' | 'month_range_daily'
  scheduled_for       TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'sent' | 'dismissed' | 'snoozed'
  snoozed_until       TIMESTAMPTZ,                         -- if set, reminder is paused until this time
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_follow_up_reminder_lead"
  ON "FollowUpReminder"(lead_id);

CREATE INDEX IF NOT EXISTS "idx_follow_up_reminder_recruiter"
  ON "FollowUpReminder"(recruiter_user_id);

CREATE INDEX IF NOT EXISTS "idx_follow_up_reminder_schedule"
  ON "FollowUpReminder"(call_schedule_id);

-- Composite index for the cron's due-reminder query
CREATE INDEX IF NOT EXISTS "idx_follow_up_reminder_due"
  ON "FollowUpReminder"(status, scheduled_for)
  WHERE status = 'pending';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────────────
SELECT 'CandidateCalendarSetting' AS table_name, COUNT(*) AS column_count
FROM information_schema.columns WHERE table_name = 'CandidateCalendarSetting'
UNION ALL
SELECT 'FollowUpReminder', COUNT(*)
FROM information_schema.columns WHERE table_name = 'FollowUpReminder';
