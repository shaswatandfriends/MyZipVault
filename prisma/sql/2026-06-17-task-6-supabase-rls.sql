-- ════════════════════════════════════════════════════════════════════
-- Task 6: Supabase Row Level Security (RLS) — Additive metadata-only migration
-- (CORRECTED: CamelCase table names)
-- Date: 2026-06-17
-- Author: Super Z (committed by Shaswat Pandey)
--
-- Purpose:
--   Enables Row Level Security on all application tables as defense-in-depth.
--   The app uses Prisma with the Supabase SERVICE ROLE key, which bypasses
--   RLS entirely — so enabling RLS has ZERO effect on the running app.
--   This is purely defensive: if anyone ever tries to query Supabase directly
--   from the browser using the anon key, RLS blocks them.
--
-- Safety:
--   ✅ 100% METADATA ONLY — no rows read, modified, or deleted
--   ✅ No existing columns or tables are modified
--   ✅ App continues to work via Prisma + service role key (bypasses RLS)
--   ✅ Rollback: ALTER TABLE <name> DISABLE ROW LEVEL SECURITY; (per table)
--
-- Naming convention: This database uses CamelCase table names (Organization,
-- User, etc.) matching Prisma's default behavior.
-- ════════════════════════════════════════════════════════════════════

-- ─── Enable RLS on all application tables (CamelCase names) ──────────
-- Listed alphabetically. Each ALTER is idempotent.

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateChecklistResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SkillRating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Credential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resume" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferenceQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferenceResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UnlockedDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PendingReminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Banner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemErrorLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomatedRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShareRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecruiterLead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecruiterAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferenceDeletionRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VaultSignTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VaultSignDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VaultSignSigner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VaultSignReminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailCampaignRecipient" ENABLE ROW LEVEL SECURITY;

-- ─── Add service_role full-access policies ───────────────────────────
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'Organization', 'User', 'AdminPermission', 'CandidateProfile',
    'ChecklistTemplate', 'Skill', 'ChecklistRequest',
    'CandidateChecklistResponse', 'SkillRating', 'Credential',
    'Resume', 'CandidateReference', 'ReferenceQuestion',
    'ReferenceResponse', 'ConsentShare', 'UnlockedDocument',
    'CreditTransaction', 'Invoice', 'Notification', 'PendingReminder',
    'PlatformSetting', 'FeatureFlag', 'EmailTemplate', 'Announcement',
    'Banner', 'DocumentFlag', 'SystemErrorLog', 'AuditLog',
    'AutomatedRule', 'InviteToken', 'ApiKey', 'ShareRequest',
    'CalendarAvailability', 'CalendarShare', 'RecruiterLead',
    'CallSchedule', 'CallLog', 'RecruiterAvailability',
    'ReferenceDeletionRequest', 'ShiftRequest', 'VaultSignTemplate',
    'VaultSignDocument', 'VaultSignSigner', 'VaultSignReminder',
    'DocumentVerification', 'EmailCampaign', 'EmailCampaignRecipient'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "service_role_full_access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
