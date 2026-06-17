-- ════════════════════════════════════════════════════════════════════
-- Task 6: Supabase Row Level Security (RLS) — Additive metadata-only migration
-- Date: 2026-06-17
-- Author: Super Z (committed by Shaswat Pandey)
--
-- Purpose:
--   Enables Row Level Security on all application tables as defense-in-depth.
--   Currently the app uses Prisma with the Supabase SERVICE ROLE key, which
--   bypasses RLS entirely — so enabling RLS has ZERO effect on the running app.
--   This is purely defensive: if anyone ever tries to query Supabase directly
--   from the browser using the anon key, RLS blocks them.
--
-- Pre-flight verification (performed by Super Z):
--   ✅ Confirmed getSupabaseClient() (anon key) is defined in src/lib/supabase.ts
--      but NOT used anywhere in the codebase
--   ✅ All actual storage operations use getSupabaseAdmin() (service role key)
--   ✅ Service role bypasses RLS — app continues to work unchanged
--
-- Safety:
--   ✅ 100% METADATA ONLY — no rows read, modified, or deleted
--   ✅ No existing columns or tables are modified
--   ✅ App continues to work via Prisma + service role key (bypasses RLS)
--   ✅ Rollback: ALTER TABLE <name> DISABLE ROW LEVEL SECURITY; (per table)
--
-- Strategy:
--   - ENABLE RLS on every table (blocks all anon-key access by default)
--   - Add a "service_role_full_access" policy on each table that explicitly
--     grants full access to the service_role (belt-and-suspenders — service
--     role already bypasses RLS, but this is explicit documentation)
--   - Do NOT add any policy for anon/authenticated roles — they get nothing
--     by default, which is the safest posture
--
-- Post-conditions:
--   - Browser clients using anon key get zero rows from any table
--   - App using service role key (via Prisma) works exactly as before
--   - Future client-side reads (if ever added) will require explicit policies
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- Helper: enable RLS + add service_role policy on a table.
-- We use DO $$ ... $$ blocks because Supabase SQL Editor doesn't accept
-- function definitions with ALTER TABLE inside a transaction in some
-- configurations. Inline DO blocks are safer.

-- ─── Enable RLS on all application tables ─────────────────────────────
-- Listed alphabetically. Each ALTER is idempotent (safe to re-run).

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "candidate_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "candidate_checklist_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resumes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "candidate_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unlocked_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pending_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "banners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_error_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automated_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invite_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "share_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recruiter_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recruiter_availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_deletion_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vault_sign_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vault_sign_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vault_sign_signers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vault_sign_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_campaign_recipients" ENABLE ROW LEVEL SECURITY;

-- ─── Add service_role full-access policies ───────────────────────────
-- These are belt-and-suspenders. The service_role already bypasses RLS,
-- but explicit policies document the intent and provide a fallback if
-- Supabase ever changes their service_role behavior.
--
-- We use CREATE POLICY IF NOT EXISTS (Postgres 15+ syntax, Supabase supports this)
-- If your Postgres version doesn't support IF NOT EXISTS, you can wrap in DO blocks.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'organizations', 'users', 'admin_permissions', 'candidate_profiles',
    'checklist_templates', 'skills', 'checklist_requests',
    'candidate_checklist_responses', 'skill_ratings', 'credentials',
    'resumes', 'candidate_references', 'reference_questions',
    'reference_responses', 'consent_shares', 'unlocked_documents',
    'credit_transactions', 'invoices', 'notifications', 'pending_reminders',
    'platform_settings', 'feature_flags', 'email_templates', 'announcements',
    'banners', 'document_flags', 'system_error_logs', 'audit_logs',
    'automated_rules', 'invite_tokens', 'api_keys', 'share_requests',
    'calendar_availability', 'calendar_shares', 'recruiter_leads',
    'call_schedules', 'call_logs', 'recruiter_availability',
    'reference_deletion_requests', 'shift_requests', 'vault_sign_templates',
    'vault_sign_documents', 'vault_sign_signers', 'vault_sign_reminders',
    'document_verifications', 'email_campaigns', 'email_campaign_recipients'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "service_role_full_access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN
      -- Policy already exists — skip
      NULL;
    END;
  END LOOP;
END $$;

COMMIT;

-- ─── Verification queries (run manually to confirm) ──────────────────
-- Every table should have rowsecurity = true (t)

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND rowsecurity = false;
-- -- Should return ZERO rows (all tables have RLS enabled)

-- SELECT tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname = 'service_role_full_access'
-- ORDER BY tablename;
-- -- Should return one row per table (47 rows total)
