-- ════════════════════════════════════════════════════════════════════
-- Phase 2.1 — Commission & Ownership Config PlatformSettings
-- Date: 2026-09-11
--
-- Purpose:
--   Foundation for the Phase 3 bonus jobs feature + future commission system.
--   Adds 6 superadmin-managed settings that govern:
--     - Platform split % (recruiter's share of placement fee)
--     - Bonus % (extra on urgent/bonus jobs)
--     - Ownership residual % (when Recruiter B submits Recruiter A's candidate)
--     - Exclusive + residual ownership windows (in days)
--     - Invite cooldown (hours between re-invites of same candidate)
--
-- These settings are read by:
--   - /api/recruiter/jobs/[id]/submit (payout split calculation)
--   - /api/recruiter/invite (72-hr cooldown enforcement — Phase 3)
--   - /recruiter/jobs UI (bonus badge display — Phase 2.4)
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO "PlatformSetting" ("setting_key", "setting_value")
VALUES
  ('platform_split_percent',          '70'),   -- recruiter's share of placement fee
  ('bonus_percent',                  '5'),    -- extra % on urgent/bonus jobs (70 → 75)
  ('ownership_residual_percent',     '5'),    -- Recruiter A's residual when B closes
  ('ownership_exclusive_days',       '90'),   -- exclusive ownership window
  ('ownership_residual_days',        '180'),  -- residual window after exclusive
  ('invite_cooldown_hours',          '72')    -- min hours between re-invites
ON CONFLICT ("setting_key") DO UPDATE SET setting_value = EXCLUDED.setting_value;

COMMIT;

-- Verification
SELECT setting_key, setting_value
FROM "PlatformSetting"
WHERE setting_key IN (
  'platform_split_percent',
  'bonus_percent',
  'ownership_residual_percent',
  'ownership_exclusive_days',
  'ownership_residual_days',
  'invite_cooldown_hours'
)
ORDER BY setting_key;
