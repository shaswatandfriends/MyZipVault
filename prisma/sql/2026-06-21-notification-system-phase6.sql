-- ════════════════════════════════════════════════════════════════════
-- Phase 6: Notification System Redo — schema migration
-- Date: 2026-06-21
--
-- Adds:
--   1. New columns on Notification: priority, is_emailed, action_url, action_label, category
--   2. New table: NotificationDefault (super admin controlled defaults per category)
--
-- Safety: 100% ADDITIVE — new columns nullable with safe defaults
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Add new columns to Notification ───────────────────────────
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "priority" VARCHAR(20) DEFAULT 'info';
  -- Values: urgent | important | info

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "category" VARCHAR(50) DEFAULT 'system';
  -- Values: rtr | document | status | calendar | credit | compliance | system

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "is_emailed" BOOLEAN DEFAULT false;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "action_url" VARCHAR(500);

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "action_label" VARCHAR(100);

-- Index for efficient queries (by user + unread + priority)
CREATE INDEX IF NOT EXISTS "Notification_user_unread_priority_idx"
  ON "Notification"("user_id", "is_read", "priority");

CREATE INDEX IF NOT EXISTS "Notification_user_category_idx"
  ON "Notification"("user_id", "category");


-- ─── 2. Create NotificationDefault table ──────────────────────────
-- Super admin controls which categories get email/SMS/in-app by default.
-- One row per category. Applies to ALL users platform-wide.
-- Urgent priority always emails regardless of these settings.

CREATE TABLE IF NOT EXISTS "NotificationDefault" (
  "id"              SERIAL PRIMARY KEY,
  "category"        VARCHAR(50) NOT NULL UNIQUE,
    -- rtr | document | status | calendar | credit | compliance | system
  "email_enabled"   BOOLEAN DEFAULT true,
  "in_app_enabled"  BOOLEAN DEFAULT true,
  "sms_enabled"     BOOLEAN DEFAULT false,
  "updated_at"      TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Seed default values
INSERT INTO "NotificationDefault" ("category", "email_enabled", "in_app_enabled", "sms_enabled") VALUES
  ('rtr',         true,  true,  false),
  ('document',    true,  true,  false),
  ('status',      false, true,  false),
  ('calendar',    false, true,  false),
  ('credit',      true,  true,  false),
  ('compliance',  true,  true,  false),
  ('system',      true,  true,  false)
ON CONFLICT ("category") DO NOTHING;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP TABLE IF EXISTS "NotificationDefault";
-- ALTER TABLE "Notification" DROP COLUMN IF EXISTS "priority";
-- ALTER TABLE "Notification" DROP COLUMN IF EXISTS "category";
-- ALTER TABLE "Notification" DROP COLUMN IF EXISTS "is_emailed";
-- ALTER TABLE "Notification" DROP COLUMN IF EXISTS "action_url";
-- ALTER TABLE "Notification" DROP COLUMN IF EXISTS "action_label";
-- COMMIT;
