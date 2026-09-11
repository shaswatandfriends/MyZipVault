-- ════════════════════════════════════════════════════════════════════
-- Corrective migration — Fix checklist_validity_days supersede bug
-- Date: 2026-09-11
--
-- Purpose:
--   The 2026-06-23-checklist-expiry-supersede.sql migration used
--   ON CONFLICT DO NOTHING, which means if the seed had already set
--   these values, the migration silently did NOT update them. This
--   corrective migration forces the intended values.
--
--   Run this in Supabase SQL Editor once. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- Force the intended checklist validity/reminder values
INSERT INTO "PlatformSetting" ("setting_key", "setting_value")
VALUES
  ('checklist_validity_days', '365'),
  ('checklist_reminder_enabled', 'true'),
  ('checklist_reminder_days_before', '2'),
  ('checklist_reminder_email_enabled', 'true'),
  ('checklist_reminder_inapp_enabled', 'true'),
  ('checklist_reminder_sms_enabled', 'false')
ON CONFLICT ("setting_key") DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Force the checklist_expiry_reminder email template (already in DB but with
-- the old plain-text body — refresh to the HTML version if needed)
INSERT INTO "EmailTemplate" ("template_key", "subject", "body")
VALUES
  (
    'checklist_expiry_reminder',
    'Action needed: Your skills checklist expires in {{days_remaining}} days',
    '<p>Hello {{candidate_name}},</p><p>This is a friendly reminder that the skills checklist <strong>{{checklist_name}}</strong> requested by <strong>{{recruiter_name}}</strong> will expire in <strong>{{days_remaining}} days</strong>.</p><p>If you don''t complete it before the expiry date, the request will be cancelled and the recruiter will need to send a new one.</p><p><a href="{{login_link}}" style="background-color:#166534;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Complete Checklist</a></p><p>Thank you,<br/>MyZipVault Team</p>'
  )
ON CONFLICT ("template_key") DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body;

COMMIT;

-- Verification (run after the BEGIN/COMMIT block above)
SELECT setting_key, setting_value
FROM "PlatformSetting"
WHERE setting_key LIKE 'checklist_%'
ORDER BY setting_key;
