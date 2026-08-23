-- ─────────────────────────────────────────────────────────────────────
-- Migration: Add branding fields to EmailCampaign
-- Date: 2026-08-24
-- Purpose: Support branded email wrapper with custom from-name,
--          reply-to, logo, and accent color per campaign.
-- Safety:  100% additive — uses ADD COLUMN IF NOT EXISTS.
-- ROLLBACK:
--   ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "from_name";
--   ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "reply_to";
--   ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "logo_url";
--   ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "accent_color";
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "from_name" VARCHAR(100);
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "reply_to" VARCHAR(255);
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "logo_url" VARCHAR(500);
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "accent_color" VARCHAR(20);
