-- ════════════════════════════════════════════════════════════════════
-- Update checklist_expiry_reminder email template to CRM design + brand palette
-- Date: 2026-09-17
--
-- This template was seeded by 2026-06-23-checklist-expiry-supersede.sql with
-- plain HTML. It was NOT included in the 2026-09-11 CRM redesign migration
-- (which only covered 9 templates). This migration brings it in line with
-- the CRM design: teal header, terracotta brand name, white card, brand
-- colors.
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE "EmailTemplate"
SET
  subject = 'Action needed: Your skills checklist expires in {{days_remaining}} days',
  body = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F7F3E8;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#263633;line-height:1.6;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F7F3E8;"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(23,74,67,0.06);border:1px solid #E5DFCF;"><tr><td style="background-color:#174A43;padding:28px 32px;text-align:center;"><div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div><div style="font-size:11px;font-weight:600;color:#D98F78;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">Checklist Expiring Soon</div></td></tr><tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#263633;"><p style="margin:0 0 16px 0;">Hello <strong style="color:#174A43;">{{candidate_name}}</strong>,</p><p style="margin:0 0 16px 0;color:#5C6B66;">This is a friendly reminder that the skills checklist <strong style="color:#174A43;">{{checklist_name}}</strong> requested by <strong style="color:#174A43;">{{recruiter_name}}</strong> will expire in <strong style="color:#D98F78;">{{days_remaining}} days</strong>.</p><p style="margin:0 0 16px 0;color:#5C6B66;">If you don''t complete it before the expiry date, the request will be cancelled and the recruiter will need to send a new one.</p><div style="text-align:center;margin:28px 0;"><a href="{{login_link}}" style="background-color:#174A43;color:#FFFFFF;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">Complete Checklist</a></div><p style="margin:0 0 16px 0;color:#8B9994;font-size:13px;">If the button doesn''t work, copy and paste this link into your browser:<br><a href="{{login_link}}" style="color:#174A43;word-break:break-all;">{{login_link}}</a></p></td></tr><tr><td style="padding:0 36px 20px 36px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #E5DFCF;padding-top:20px;"><tr><td style="font-size:12px;color:#8B9994;text-align:center;">You received this email because you have a pending skills checklist request on MyZipVault.<br>© 2026 MyZipVault. All rights reserved. · HIPAA Aligned · 256-bit Encryption · BAA Available</td></tr></table></td></tr></table></td></tr></table></body></html>'
WHERE template_key = 'checklist_expiry_reminder';

COMMIT;

-- Verification
SELECT template_key, length(body) AS body_length, updated_at
FROM "EmailTemplate"
WHERE template_key = 'checklist_expiry_reminder';
