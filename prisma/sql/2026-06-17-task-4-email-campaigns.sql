-- ════════════════════════════════════════════════════════════════════
-- Task 4: Email Campaigns — Additive migration
-- Date: 2026-06-17
-- Author: Super Z (committed by Shaswat Pandey)
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
--   ✅ Rollback: DROP TABLE email_campaign_recipients, email_campaigns;
--   ✅ Foreign keys reference existing users(id) — relationship is new but
--      users table is untouched
--
-- Tables created:
--   1. email_campaigns — campaign metadata (name, subject, body, status, counts)
--   2. email_campaign_recipients — per-recipient delivery tracking
--
-- Post-conditions:
--   - Prisma schema will be updated to add EmailCampaign + EmailCampaignRecipient models
--   - New API routes under /api/superadmin/email-campaigns/ will use these tables
--   - New UI in /superadmin/announcements (Email Campaigns tab) will use these
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table 1: email_campaigns ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id"                  SERIAL PRIMARY KEY,
  "name"                VARCHAR(255) NOT NULL,
  "subject"             VARCHAR(500) NOT NULL,
  "body"                TEXT NOT NULL,
  "target_role"         VARCHAR(50) NOT NULL DEFAULT 'all',
    -- 'all' | 'candidate' | 'client_recruiter' | 'client_admin' |
    -- 'platform_admin' | 'super_admin'
  "target_filter"       TEXT,
    -- JSON string for additional filters, e.g. {"specialty":"ICU","state":"CA"}
    -- nullable — when null, no additional filters applied
  "status"              VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- 'draft' | 'queued' | 'sending' | 'sent' | 'partial_failure' | 'cancelled'
  "total_recipients"    INTEGER NOT NULL DEFAULT 0,
  "sent_count"          INTEGER NOT NULL DEFAULT 0,
  "failed_count"        INTEGER NOT NULL DEFAULT 0,
  "created_by"          INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at"          TIMESTAMP(3),
  "completed_at"        TIMESTAMP(3),
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS "idx_email_campaigns_created_at"
  ON "email_campaigns"("created_at" DESC);

-- Index for filtering by status (queue processor uses this)
CREATE INDEX IF NOT EXISTS "idx_email_campaigns_status"
  ON "email_campaigns"("status");

-- Index for filtering by target role
CREATE INDEX IF NOT EXISTS "idx_email_campaigns_target_role"
  ON "email_campaigns"("target_role");

-- ─── Table 2: email_campaign_recipients ───────────────────────────────
CREATE TABLE IF NOT EXISTS "email_campaign_recipients" (
  "id"                  SERIAL PRIMARY KEY,
  "campaign_id"         INTEGER NOT NULL
    REFERENCES "email_campaigns"("id") ON DELETE CASCADE,
  "recipient_user_id"   INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    -- nullable: if a user is deleted, we keep the historical delivery record
    -- but lose the link to which user it was
  "recipient_email"     VARCHAR(255) NOT NULL,
  "recipient_name"      VARCHAR(255),
    -- snapshot of recipient's name at send time (for historical record)
  "status"              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'sent' | 'failed' | 'bounced' | 'complained'
  "error_message"       TEXT,
    -- populated when status = 'failed' or 'bounced'
  "brevo_message_id"    VARCHAR(255),
    -- Brevo's message ID for tracking opens/clicks/deliveries
  "queued_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at"             TIMESTAMP(3),
  "delivered_at"        TIMESTAMP(3),
  "opened_at"           TIMESTAMP(3),
  "clicked_at"          TIMESTAMP(3)
);

-- Index for joining recipients to their campaign
CREATE INDEX IF NOT EXISTS "idx_email_campaign_recipients_campaign_id"
  ON "email_campaign_recipients"("campaign_id");

-- Index for status-based filtering (queue processor uses this)
CREATE INDEX IF NOT EXISTS "idx_email_campaign_recipients_status"
  ON "email_campaign_recipients"("status");

-- Index for user lookup (e.g., "show me all campaigns sent to user X")
CREATE INDEX IF NOT EXISTS "idx_email_campaign_recipients_recipient_user_id"
  ON "email_campaign_recipients"("recipient_user_id");

-- Index for email lookup (e.g., bounce/complaint tracking by email)
CREATE INDEX IF NOT EXISTS "idx_email_campaign_recipients_recipient_email"
  ON "email_campaign_recipients"("recipient_email");

COMMIT;

-- ─── Verification queries (run manually to confirm) ──────────────────
-- SELECT count(*) FROM email_campaigns;  -- should return 0
-- SELECT count(*) FROM email_campaign_recipients;  -- should return 0

-- SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('email_campaigns', 'email_campaign_recipients');
--   -- should return both rows
