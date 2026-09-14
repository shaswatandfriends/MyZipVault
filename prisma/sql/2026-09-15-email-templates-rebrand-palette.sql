-- ════════════════════════════════════════════════════════════════════
-- Rebrand: Email templates — swap old navy/gold palette to brand teal/sage/ivory/terracotta
-- Date: 2026-09-15
--
-- Purpose:
--   The 9 CRM-style email templates (seeded by 2026-09-11-email-templates-crm-redesign.sql)
--   used the OLD brand palette: dark navy #0B1F3A header + gold #C9A961 accent.
--   This migration updates all 9 templates IN-PLACE to use the NEW brand palette:
--     - #0B1F3A (dark navy header) → #174A43 (deep teal header)
--     - #C9A961 (gold accent)      → #D98F78 (terracotta accent)
--     - #F5F7FA (cool gray bg)     → #F7F3E8 (warm ivory bg)
--     - #1C1C1E (cool body text)   → #263633 (deep charcoal)
--     - #3C3C43 (secondary text)   → #5C6B66 (sage-tinted charcoal)
--     - #E5E7EB (border)           → #E5DFCF (ivory-tinted border)
--
--   This is a string REPLACE on the body column — no structural changes.
--
-- Affects templates:
--   candidate_invite, checklist_request, existing_candidate_checklist,
--   checklist_reminder, email_verification, password_reset,
--   credential_rejected, welcome_candidate, vaultsign_invitation
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE "EmailTemplate"
SET body = REPLACE(body, '#0B1F3A', '#174A43'),
    subject = REPLACE(subject, '#0B1F3A', '#174A43')
WHERE template_key IN (
  'candidate_invite','checklist_request','existing_candidate_checklist',
  'checklist_reminder','email_verification','password_reset',
  'credential_rejected','welcome_candidate','vaultsign_invitation'
);

UPDATE "EmailTemplate"
SET body = REPLACE(body, '#C9A961', '#D98F78'),
    subject = REPLACE(subject, '#C9A961', '#D98F78')
WHERE template_key IN (
  'candidate_invite','checklist_request','existing_candidate_checklist',
  'checklist_reminder','email_verification','password_reset',
  'credential_rejected','welcome_candidate','vaultsign_invitation'
);

UPDATE "EmailTemplate"
SET body = REPLACE(body, '#F5F7FA', '#F7F3E8')
WHERE template_key IN (
  'candidate_invite','checklist_request','existing_candidate_checklist',
  'checklist_reminder','email_verification','password_reset',
  'credential_rejected','welcome_candidate','vaultsign_invitation'
);

UPDATE "EmailTemplate"
SET body = REPLACE(body, '#1C1C1E', '#263633')
WHERE template_key IN (
  'candidate_invite','checklist_request','existing_candidate_checklist',
  'checklist_reminder','email_verification','password_reset',
  'credential_rejected','welcome_candidate','vaultsign_invitation'
);

UPDATE "EmailTemplate"
SET body = REPLACE(body, '#3C3C43', '#5C6B66')
WHERE template_key IN (
  'candidate_invite','checklist_request','existing_candidate_checklist',
  'checklist_reminder','email_verification','password_reset',
  'credential_rejected','welcome_candidate','vaultsign_invitation'
);

UPDATE "EmailTemplate"
SET body = REPLACE(body, '#E5E7EB', '#E5DFCF')
WHERE template_key IN (
  'candidate_invite','checklist_request','existing_candidate_checklist',
  'checklist_reminder','email_verification','password_reset',
  'credential_rejected','welcome_candidate','vaultsign_invitation'
);

COMMIT;

-- Verification — should show 0 occurrences of old palette, many of new
SELECT
  template_key,
  (LENGTH(body) - LENGTH(REPLACE(body, '#0B1F3A', ''))) / 6 AS old_navy_count,
  (LENGTH(body) - LENGTH(REPLACE(body, '#C9A961', ''))) / 6 AS old_gold_count,
  (LENGTH(body) - LENGTH(REPLACE(body, '#174A43', ''))) / 6 AS new_teal_count,
  (LENGTH(body) - LENGTH(REPLACE(body, '#D98F78', ''))) / 6 AS new_terracotta_count
FROM "EmailTemplate"
WHERE template_key IN (
  'candidate_invite','checklist_request','existing_candidate_checklist',
  'checklist_reminder','email_verification','password_reset',
  'credential_rejected','welcome_candidate','vaultsign_invitation'
)
ORDER BY template_key;
