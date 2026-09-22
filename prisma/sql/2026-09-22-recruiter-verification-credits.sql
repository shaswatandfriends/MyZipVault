-- ════════════════════════════════════════════════════════════════════
-- Add recruiter verification + certification fields to User
-- Date: 2026-09-22
--
-- New fields:
--   verification_status     — 'unverified' | 'pending' | 'verified' | 'failed' | 'cooldown'
--   verification_completed_at — when verification was completed (external portal)
--   verification_expires_at  — 1 year after completion (needs renewal)
--   verification_failed_at   — when last attempt failed (45-day cooldown)
--   certification_tags       — JSON array of tags: ['allied','nursing','locums','non_clinical']
--   credit_daily_used        — credits used today (resets daily)
--   credit_daily_reset_at    — when daily counter last reset
--   credit_monthly_used      — credits used this month (resets monthly)
--   credit_monthly_reset_at  — when monthly counter last reset
--
-- Credit limits:
--   Unverified: 10 credits/day, 100 credits/month
--   Verified:   50 credits/day, 500 credits/month
--
-- Run in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certification_tags TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS credit_daily_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS credit_monthly_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_monthly_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Index for quick lookup of verification status
CREATE INDEX IF NOT EXISTS "idx_user_verification_status"
  ON "User"(verification_status);

COMMIT;

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'User'
  AND column_name IN (
    'verification_status', 'verification_completed_at', 'verification_expires_at',
    'verification_failed_at', 'certification_tags',
    'credit_daily_used', 'credit_daily_reset_at',
    'credit_monthly_used', 'credit_monthly_reset_at'
  )
ORDER BY ordinal_position;
