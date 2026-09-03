-- ─────────────────────────────────────────────────────────────────────
-- MyZipVault — Job Alert Subscriptions
-- Created: 2026-09-03
--
-- Candidates subscribe to job alerts by specialty + location.
-- When a matching job is posted, they get an email notification.
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS "JobAlertSubscription" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  specialty TEXT,
  state TEXT,
  city TEXT,
  employment_type TEXT,
  is_remote BOOLEAN DEFAULT false,
  keywords TEXT,
  email_frequency TEXT NOT NULL DEFAULT 'instant',  -- 'instant' | 'daily' | 'weekly'
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_job_alert_user" ON "JobAlertSubscription"(user_id);
CREATE INDEX IF NOT EXISTS "idx_job_alert_active" ON "JobAlertSubscription"(is_active);
CREATE INDEX IF NOT EXISTS "idx_job_alert_specialty" ON "JobAlertSubscription"(specialty);
CREATE INDEX IF NOT EXISTS "idx_job_alert_state" ON "JobAlertSubscription"(state);

COMMIT;
