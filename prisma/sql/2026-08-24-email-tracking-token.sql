-- ─────────────────────────────────────────────────────────────────────
-- Migration: Add tracking_token to EmailCampaignRecipient
-- Date: 2026-08-24
-- Purpose: Per-recipient unguessable token for email open tracking
--          (tracking pixel) and click tracking (link redirect).
-- Safety:  100% additive — uses ADD COLUMN IF NOT EXISTS.
-- ROLLBACK:
--   ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "tracking_token";
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE "EmailCampaignRecipient"
  ADD COLUMN IF NOT EXISTS "tracking_token" VARCHAR(64) UNIQUE;

-- Backfill existing rows with random UUIDs (for any historical recipients)
UPDATE "EmailCampaignRecipient"
SET "tracking_token" = gen_random_uuid()::text
WHERE "tracking_token" IS NULL;

-- Index for fast lookup by token (the tracking endpoints query by this)
CREATE INDEX IF NOT EXISTS "idx_email_campaign_recipient_tracking_token"
  ON "EmailCampaignRecipient" ("tracking_token")
  WHERE "tracking_token" IS NOT NULL;
