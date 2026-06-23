-- ════════════════════════════════════════════════════════════════════
-- Checklist Expiry, Supersede & Per-Company Config — Additive migration
-- Date: 2026-06-23
--
-- Purpose:
--   1. Add `expires_at` to ChecklistRequest — pending requests auto-expire
--      after N days (per-company config, default 7).
--   2. Add `superseded_by_id` to CandidateChecklistResponse — when a
--      candidate chooses "Complete New" on an already-valid checklist,
--      the old response is superseded; only the latest is shareable.
--   3. Add `pending_request_expiry_days` to Organization — per-company
--      config set by superadmin (default 7).
--   4. Seed PlatformSetting with `checklist_validity_days` (global,
--      default 365) and `checklist_reminder_enabled` (default true) +
--      `checklist_reminder_days_before` (default 2).
--   5. Backfill: existing pending requests get expires_at = created_at + 7
--      days (stale ones will be cleaned up by the cron on next run).
--
-- Safety:
--   ✅ 100% ADDITIVE — only new columns + new rows, no destructive ops
--   ✅ All new columns are nullable or have defaults — no NOT NULL on
--      existing rows
--   ✅ Rollback: ALTER TABLE ... DROP COLUMN ... + DELETE FROM
--      PlatformSetting WHERE setting_key IN (...)
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. ChecklistRequest.expires_at ─────────────────────────────────
ALTER TABLE "ChecklistRequest"
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);

-- ─── 2. CandidateChecklistResponse.superseded_by_id (self-ref) ───────
ALTER TABLE "CandidateChecklistResponse"
  ADD COLUMN IF NOT EXISTS "superseded_by_id" INTEGER;

-- Add self-referencing FK (no cascade — supersede is a soft pointer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CandidateChecklistResponse_superseded_by_id_fkey'
  ) THEN
    ALTER TABLE "CandidateChecklistResponse"
      ADD CONSTRAINT "CandidateChecklistResponse_superseded_by_id_fkey"
      FOREIGN KEY ("superseded_by_id")
      REFERENCES "CandidateChecklistResponse"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

-- Unique constraint — 1:1 relation (each response can be superseded by at most one newer response)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CandidateChecklistResponse_superseded_by_id_key'
  ) THEN
    ALTER TABLE "CandidateChecklistResponse"
      ADD CONSTRAINT "CandidateChecklistResponse_superseded_by_id_key"
      UNIQUE ("superseded_by_id");
  END IF;
END $$;

-- Index for fast "is this response superseded?" lookups
CREATE INDEX IF NOT EXISTS "CandidateChecklistResponse_superseded_by_id_idx"
  ON "CandidateChecklistResponse"("superseded_by_id");

-- ─── 3. Organization.pending_request_expiry_days ────────────────────
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "pending_request_expiry_days" INTEGER NOT NULL DEFAULT 7;

-- ─── 4. Seed PlatformSetting defaults ───────────────────────────────
INSERT INTO "PlatformSetting" ("setting_key", "setting_value")
VALUES
  ('checklist_validity_days', '365'),
  ('checklist_reminder_enabled', 'true'),
  ('checklist_reminder_days_before', '2'),
  ('checklist_reminder_email_enabled', 'true'),
  ('checklist_reminder_inapp_enabled', 'true'),
  ('checklist_reminder_sms_enabled', 'false')
ON CONFLICT ("setting_key") DO NOTHING;

-- ─── 4b. Seed the checklist_expiry_reminder email template ──────────
INSERT INTO "EmailTemplate" ("template_key", "subject", "body")
VALUES
  (
    'checklist_expiry_reminder',
    'Action needed: Your skills checklist expires in {{days_remaining}} days',
    '<p>Hello {{candidate_name}},</p><p>This is a friendly reminder that the skills checklist <strong>{{checklist_name}}</strong> requested by <strong>{{recruiter_name}}</strong> will expire in <strong>{{days_remaining}} days</strong>.</p><p>If you don''t complete it before the expiry date, the request will be cancelled and the recruiter will need to send a new one.</p><p><a href="{{login_link}}" style="background-color:#166534;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Complete Checklist</a></p><p>Thank you,<br/>MyZipVault Team</p>'
  )
ON CONFLICT ("template_key") DO NOTHING;

-- ─── 5. Backfill existing pending requests ──────────────────────────
-- Per user decision: expires_at = created_at + 7 days for all existing
-- sent/opened/in_progress requests. Stale ones (created > 7 days ago)
-- will be picked up by the cron job and marked as "expired".
UPDATE "ChecklistRequest"
SET "expires_at" = "created_at" + INTERVAL '7 days'
WHERE "expires_at" IS NULL
  AND "status" IN ('sent', 'opened', 'in_progress');

-- Index for cron's expiry sweep query
CREATE INDEX IF NOT EXISTS "ChecklistRequest_expires_at_status_idx"
  ON "ChecklistRequest"("expires_at")
  WHERE "status" IN ('sent', 'opened', 'in_progress');

COMMIT;
