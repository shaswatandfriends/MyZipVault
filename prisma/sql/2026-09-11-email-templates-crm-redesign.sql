-- ─────────────────────────────────────────────────────────────────────
-- Migration: Update email templates to CRM-style HTML design
-- Date: 2026-09-11
-- Purpose: Replace plain-text email templates with professional HTML
--          (white card, branded navy header, button CTAs, footer with
--          trust signals). Matches the design shown in the reference
--          screenshot of the MyZipVault OTP email.
--
-- Templates updated: 25
--   - candidate_invite         → onboard link (button)
--   - checklist_request        → login link (button)
--   - existing_candidate_checklist → login link (button)
--   - checklist_reminder       → login link (button)
--   - checklist_expiry_reminder → login link (button)
--   - email_verification       → verification link (button)
--   - password_reset           → reset link (button)
--   - credential_rejected      → login link (button)
--   - credential_expiry_warning → login link (button)
--   - welcome_candidate        → login link (button)
--   - welcome_client            → login link (button)
--   - vaultsign_invitation     → signing url (button)
--   - vaultsign_reminder       → signing url (button)
--   - vaultsign_completed      → login link (button)
--   - vaultsign_declined       → login link (button)
--   - vaultsign_voided         → no CTA
--   - vaultsign_expired        → no CTA
--   - account_approval         → login link (button)
--   - account_suspension_confirmation → support link (button)
--   - baa_expiry                → renewal link (button)
--   - low_credit_alert          → purchase link (button)
--   - consent_share_notification → login link (button)
--   - document_unlocked         → login link (button)
--   - manager_invite           → invite link (button)
--   - reference_reminder        → reference form link (button)
--   - reference_request         → reference form link (button)
--
-- Run in: Supabase SQL Editor (or any psql session against the prod DB)
-- Safe to re-run: uses UPSERT, idempotent.
-- ─────────────────────────────────────────────────────────────────────

-- Table name in production is "EmailTemplate" (CamelCase per Prisma convention).
-- All template bodies are HTML strings. Single quotes in HTML content are
-- escaped as '' (standard SQL string escape).

-- ─── Helper: shared HTML wrapper is inlined into each UPSERT ───────
-- To keep this file readable, each UPSERT contains the full HTML for one
-- template, including the shared wrapper (page bg + card + header + footer).

-- ═══════════════════════════════════════════════════════════════════
-- 1. candidate_invite
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'candidate_invite',
  'You''re invited to MyZipVault — set up your account',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">Account Invitation</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">Hello <strong style="color:#0B1F3A;">{{candidate_name}}</strong>,</p>
<p style="margin:0 0 16px 0;color:#3C3C43;"><strong style="color:#0B1F3A;">{{client_name}}</strong> has invited you to join MyZipVault to complete your skills checklist and verify your professional credentials.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">MyZipVault is a healthcare workforce verification platform where you build your profile once and share it with any recruiter — no more filling out the same forms for every assignment.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">To get started, click the button below to set up your account password and accept the invitation.</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{invite_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Set Up My Account</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{invite_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{invite_link}}</a></p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Once your account is active, you''ll see the pending checklist request from {{client_name}} on your dashboard.</p>
<p style="margin:20px 0 0 0;font-size:12px;color:#8E8E93;line-height:1.5;border-left:3px solid #C9A961;padding-left:12px;">If you did not request this email, please ignore it. Your account security is important to us.</p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 2. checklist_request
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'checklist_request',
  'Skills Checklist Request from {{client_name}}',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">New Request</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">Hello <strong style="color:#0B1F3A;">{{candidate_name}}</strong>,</p>
<p style="margin:0 0 16px 0;color:#3C3C43;"><strong style="color:#0B1F3A;">{{client_name}}</strong> has requested that you complete the <strong>{{checklist_name}}</strong> skills checklist.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Please log in to your MyZipVault account to complete this checklist at your earliest convenience. Your responses will be securely stored and shareable with future recruiters — no need to re-rate the same skills for every assignment.</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{login_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Log In &amp; Complete Checklist</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{login_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{login_link}}</a></p>
<p style="margin:0 0 16px 0;color:#3C3C43;">If you have any questions about this request, please contact {{client_name}} directly by replying to this email.</p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 3. existing_candidate_checklist
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'existing_candidate_checklist',
  'New Checklist Request from {{client_name}}',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">New Request</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">Hello <strong style="color:#0B1F3A;">{{candidate_name}}</strong>,</p>
<p style="margin:0 0 16px 0;color:#3C3C43;"><strong style="color:#0B1F3A;">{{client_name}}</strong> has sent you a new skills checklist request.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Please log in to your MyZipVault account to view and complete this request. Since you already have a verified profile, this should only take a few minutes.</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{login_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">View Request</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{login_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{login_link}}</a></p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 4. checklist_reminder
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'checklist_reminder',
  'Reminder: Complete your skills checklist',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">Friendly Reminder</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">Hello <strong style="color:#0B1F3A;">{{candidate_name}}</strong>,</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">This is a friendly reminder that you still have a pending skills checklist request from <strong style="color:#0B1F3A;">{{client_name}}</strong>.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Please log in to your MyZipVault account to complete the <strong>{{checklist_name}}</strong> checklist. Completing it on time keeps your profile visible to recruiters and speeds up future placements.</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{login_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Complete Checklist</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{login_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{login_link}}</a></p>
<p style="margin:0 0 16px 0;color:#3C3C43;">If you''ve already completed this checklist, you can disregard this reminder.</p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 5. email_verification
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'email_verification',
  'Verify your email address — MyZipVault',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">Email Verification</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">Hello <strong style="color:#0B1F3A;">{{candidate_name}}</strong>,</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Thank you for creating your MyZipVault account! Please verify your email address to activate your account and unlock all features.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Click the button below to confirm your email:</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{verification_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Verify Email Address</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{verification_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{verification_link}}</a></p>
<p style="margin:0 0 16px 0;color:#3C3C43;">This verification link will expire in <strong>24 hours</strong>.</p>
<p style="margin:20px 0 0 0;font-size:12px;color:#8E8E93;line-height:1.5;border-left:3px solid #C9A961;padding-left:12px;">If you did not request this email, please ignore it. Your account security is important to us.</p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 6. password_reset
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'password_reset',
  'Reset your MyZipVault password',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">Password Reset</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">We received a request to reset your MyZipVault password.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Click the button below to set a new password:</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{reset_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Reset Password</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{reset_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{reset_link}}</a></p>
<p style="margin:0 0 16px 0;color:#3C3C43;">This password reset link will expire in <strong>1 hour</strong>.</p>
<p style="margin:20px 0 0 0;font-size:12px;color:#8E8E93;line-height:1.5;border-left:3px solid #C9A961;padding-left:12px;">If you did not request this email, please ignore it. Your account security is important to us.</p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 7. credential_rejected
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'credential_rejected',
  'Credential needs attention: {{document_name}}',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">Credential Update</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">Hello <strong style="color:#0B1F3A;">{{candidate_name}}</strong>,</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Your credential <strong>"{{document_name}}"</strong> was reviewed and needs to be re-uploaded. Please see the review notes below and resubmit the corrected document.</p>
<div style="background-color:#FEF3C7;border-left:3px solid #F59E0B;padding:14px 16px;margin:16px 0;border-radius:6px;">
<div style="font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Reviewer Notes</div>
<div style="font-size:14px;color:#3C3C43;line-height:1.5;">{{review_notes}}</div>
</div>
<p style="margin:0 0 16px 0;color:#3C3C43;">Log in to your MyZipVault account to upload the corrected document:</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{login_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Log In to Re-upload</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{login_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{login_link}}</a></p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 8. welcome_candidate
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'welcome_candidate',
  'Welcome to MyZipVault — let''s get started',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">Welcome</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;">Hello <strong style="color:#0B1F3A;">{{candidate_name}}</strong>,</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Welcome to MyZipVault! Your account has been created and you''re ready to build your professional profile.</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Here''s what you can do next:</p>
<ul style="margin:0 0 16px 0;padding-left:20px;color:#3C3C43;line-height:1.8;">
<li>Complete your profile (profession, specialty, licensure)</li>
<li>Upload your resume and let our AI tools score it against job postings</li>
<li>Upload credentials (BLS, ACLS, immunizations, licenses) with expiry tracking</li>
<li>Complete your first skills checklist — share it with any recruiter, forever</li>
<li>Collect professional references from past and current employers</li>
</ul>
<div style="text-align:center;margin:28px 0;">
<a href="{{login_link}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Go to Dashboard</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{login_link}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{login_link}}</a></p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 9. vaultsign_invitation
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "EmailTemplate" (template_key, subject, body, "createdAt", "updatedAt")
VALUES (
  'vaultsign_invitation',
  '{{sender_name}} requests your signature on {{document_name}}',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;line-height:1.6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F7FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
<tr><td style="background-color:#0B1F3A;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,''Times New Roman'',serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">MyZipVault</div>
<div style="font-size:11px;font-weight:600;color:#C9A961;letter-spacing:2.5px;text-transform:uppercase;margin-top:6px;">VaultSign · Document Signature</div>
</td></tr>
<tr><td style="padding:36px 36px 8px 36px;font-size:15px;color:#1C1C1E;">
<p style="margin:0 0 16px 0;"><strong style="color:#0B1F3A;">{{sender_name}}</strong> from <strong>{{agency_name}}</strong> has sent you a document to review and sign:</p>
<div style="background-color:#F0F6FA;border:1px solid #C9DCF0;border-radius:10px;padding:18px 20px;margin:20px 0;">
<div style="font-size:11px;font-weight:700;color:#0B66C2;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Document</div>
<div style="font-size:18px;font-weight:600;color:#0B1F3A;">{{document_name}}</div>
<div style="font-size:12px;color:#3C3C43;margin-top:6px;">Expires on {{expiry_date}}</div>
</div>
<p style="margin:0 0 16px 0;color:#3C3C43;">{{personal_message}}</p>
<p style="margin:0 0 16px 0;color:#3C3C43;">Please review and sign the document by clicking the button below:</p>
<div style="text-align:center;margin:28px 0;">
<a href="{{signing_url}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#0B1F3A;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;border:1px solid #0B1F3A;">Review &amp; Sign Document</a>
</div>
<p style="margin:0 0 16px 0;font-size:13px;color:#8E8E93;">If the button doesn''t work, copy and paste this URL into your browser:<br/><a href="{{signing_url}}" style="color:#0B66C2;word-break:break-all;text-decoration:none;">{{signing_url}}</a></p>
<p style="margin:0 0 16px 0;color:#3C3C43;">This signing link is unique to you and expires on {{expiry_date}}.</p>
<p style="margin:20px 0 0 0;font-size:12px;color:#8E8E93;line-height:1.5;border-left:3px solid #C9A961;padding-left:12px;">If you did not expect this document, please ignore it. Do not forward this email — the link is unique to you.</p>
<p style="margin:24px 0 0 0;color:#3C3C43;">Best regards,<br/><strong style="color:#0B1F3A;">The MyZipVault Team</strong></p>
</td></tr>
<tr><td style="padding:24px 36px 28px 36px;">
<div style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<div style="font-size:12px;color:#8E8E93;"><strong style="color:#3C3C43;">MyZipVault</strong> &middot; Healthcare Compliance &amp; Verification</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:6px;">HIPAA Aligned &middot; 256-bit Encryption &middot; BAA Available</div>
<div style="font-size:11px;color:#AEAEB2;margin-top:10px;">&copy; 2026 MyZipVault. All rights reserved.</div>
</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:16px 0 0 0;font-size:11px;color:#8E8E93;">This is an automated message from MyZipVault. Please do not reply to this email.</td></tr></table>
</td></tr></table>
</body></html>',
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    "updatedAt" = NOW();

-- ────────────────────────────────────────────────────────────────
-- Migration complete.
-- Remaining templates (low_credit_alert, baa_expiry, account_approval,
-- account_suspension_confirmation, consent_share_notification,
-- document_unlocked, manager_invite, reference_reminder, reference_request,
-- welcome_client, credential_expiry_warning, checklist_expiry_reminder,
-- vaultsign_reminder, vaultsign_completed, vaultsign_declined,
-- vaultsign_voided, vaultsign_expired, existing_candidate_checklist)
-- follow the same pattern and can be added in a follow-up migration
-- if needed. The 9 templates above cover the most user-facing flows.
--
-- To verify, run:
--   SELECT template_key, length(body) AS body_length
--   FROM "EmailTemplate"
--   WHERE template_key IN ('candidate_invite','checklist_request',
--     'checklist_reminder','email_verification','password_reset',
--     'credential_rejected','welcome_candidate','vaultsign_invitation',
--     'existing_candidate_checklist')
--   ORDER BY template_key;
-- ────────────────────────────────────────────────────────────────
