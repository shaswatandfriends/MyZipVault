-- ════════════════════════════════════════════════════════════════════
-- Task 4: Email Campaigns — Additive migration (CORRECTED: CamelCase)
-- Date: 2026-06-17
-- Author: Super Z (committed by Shaswat Pandey)
--
-- ⚠️ NOTE: This database uses CamelCase table names (Organization, User, etc.)
-- not snake_case. The original version of this file used snake_case which
-- caused "relation does not exist" errors.
--
-- Purpose:
--   Adds two new tables for the Email Campaigns feature in the Super Admin
--   Announcements page. Allows admin to send batch emails to filtered user
--   segments (all/candidate/recruiter/admin) and track per-recipient
--   delivery status.
--
-- Safety:
--   ✅ 100% ADDITIVE — no existing tables or columns are modified or dropped
--   ✅ No existing data is read, modified, or deleted
--   ✅ Rollback: DROP TABLE "EmailCampaignRecipient", "EmailCampaign";
--   ✅ Foreign keys reference existing User(id)
--
-- Tables created:
--   1. EmailCampaign — campaign metadata (name, subject, body, status, counts)
--   2. EmailCampaignRecipient — per-recipient delivery tracking
--
-- Naming convention: This database uses CamelCase table names to match
-- Prisma's default behavior when no @@map directive is used.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table 1: EmailCampaign ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailCampaign" (
  "id"                  SERIAL PRIMARY KEY,
  "name"                VARCHAR(255) NOT NULL,
  "subject"             VARCHAR(500) NOT NULL,
  "body"                TEXT NOT NULL,
  "target_role"         VARCHAR(50) NOT NULL DEFAULT 'all',
  "target_filter"       TEXT,
  "status"              VARCHAR(20) NOT NULL DEFAULT 'draft',
  "total_recipients"    INTEGER NOT NULL DEFAULT 0,
  "sent_count"          INTEGER NOT NULL DEFAULT 0,
  "failed_count"        INTEGER NOT NULL DEFAULT 0,
  "created_by"          INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at"          TIMESTAMP(3),
  "completed_at"        TIMESTAMP(3),
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EmailCampaign_created_at_idx"
  ON "EmailCampaign"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "EmailCampaign_status_idx"
  ON "EmailCampaign"("status");

CREATE INDEX IF NOT EXISTS "EmailCampaign_target_role_idx"
  ON "EmailCampaign"("target_role");

-- ─── Table 2: EmailCampaignRecipient ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailCampaignRecipient" (
  "id"                  SERIAL PRIMARY KEY,
  "campaign_id"         INTEGER NOT NULL
    REFERENCES "EmailCampaign"("id") ON DELETE CASCADE,
  "recipient_user_id"   INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "recipient_email"     VARCHAR(255) NOT NULL,
  "recipient_name"      VARCHAR(255),
  "status"              VARCHAR(20) NOT NULL DEFAULT 'pending',
  "error_message"       TEXT,
  "brevo_message_id"    VARCHAR(255),
  "queued_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at"             TIMESTAMP(3),
  "delivered_at"        TIMESTAMP(3),
  "opened_at"           TIMESTAMP(3),
  "clicked_at"          TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_campaign_id_idx"
  ON "EmailCampaignRecipient"("campaign_id");

CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_status_idx"
  ON "EmailCampaignRecipient"("status");

CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_recipient_user_id_idx"
  ON "EmailCampaignRecipient"("recipient_user_id");

CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_recipient_email_idx"
  ON "EmailCampaignRecipient"("recipient_email");

COMMIT;
