-- ════════════════════════════════════════════════════════════════════
-- Add recruiter profile settings fields to User
-- Date: 2026-09-22
--
-- New fields for recruiter public profile customization:
--   - bio                    (short professional bio)
--   - linkedin_url           (LinkedIn profile URL)
--   - twitter_url            (Twitter/X profile URL)
--   - instagram_url          (Instagram profile URL)
--   - facebook_url           (Facebook page URL)
--   - show_phone_publicly    (show phone on public profile, default true)
--   - show_email_publicly    (show email on public profile, default true)
--
-- Run in Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS show_phone_publicly BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_email_publicly BOOLEAN NOT NULL DEFAULT true;

COMMIT;
