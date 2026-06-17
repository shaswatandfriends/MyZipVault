-- ════════════════════════════════════════════════════════════════════
-- COMPREHENSIVE DATA VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify no data is missing.
--
-- This script does NOT modify any data. It only reads.
-- It produces a single result set showing every table's row count.
--
-- Compare the counts to what you expect:
--   - If a table has 0 rows but should have data → something is missing
--   - If counts match expectations → data is intact
--
-- The 3 migration SQL files (Tasks 4, 5, 6) are 100% ADDITIVE — they
-- should NOT have changed any row counts in existing tables. If a count
-- is lower than expected, it was NOT caused by these migrations.
-- ════════════════════════════════════════════════════════════════════

SELECT 'organizations' AS table_name, count(*) AS row_count FROM organizations
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'admin_permissions', count(*) FROM admin_permissions
UNION ALL SELECT 'candidate_profiles', count(*) FROM candidate_profiles
UNION ALL SELECT 'checklist_templates', count(*) FROM checklist_templates
UNION ALL SELECT 'skills', count(*) FROM skills
UNION ALL SELECT 'checklist_requests', count(*) FROM checklist_requests
UNION ALL SELECT 'candidate_checklist_responses', count(*) FROM candidate_checklist_responses
UNION ALL SELECT 'skill_ratings', count(*) FROM skill_ratings
UNION ALL SELECT 'credentials', count(*) FROM credentials
UNION ALL SELECT 'resumes', count(*) FROM resumes
UNION ALL SELECT 'candidate_references', count(*) FROM candidate_references
UNION ALL SELECT 'reference_questions', count(*) FROM reference_questions
UNION ALL SELECT 'reference_responses', count(*) FROM reference_responses
UNION ALL SELECT 'consent_shares', count(*) FROM consent_shares
UNION ALL SELECT 'unlocked_documents', count(*) FROM unlocked_documents
UNION ALL SELECT 'credit_transactions', count(*) FROM credit_transactions
UNION ALL SELECT 'invoices', count(*) FROM invoices
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'pending_reminders', count(*) FROM pending_reminders
UNION ALL SELECT 'platform_settings', count(*) FROM platform_settings
UNION ALL SELECT 'feature_flags', count(*) FROM feature_flags
UNION ALL SELECT 'email_templates', count(*) FROM email_templates
UNION ALL SELECT 'announcements', count(*) FROM announcements
UNION ALL SELECT 'banners', count(*) FROM banners
UNION ALL SELECT 'document_flags', count(*) FROM document_flags
UNION ALL SELECT 'system_error_logs', count(*) FROM system_error_logs
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
UNION ALL SELECT 'automated_rules', count(*) FROM automated_rules
UNION ALL SELECT 'invite_tokens', count(*) FROM invite_tokens
UNION ALL SELECT 'api_keys', count(*) FROM api_keys
UNION ALL SELECT 'share_requests', count(*) FROM share_requests
UNION ALL SELECT 'calendar_availability', count(*) FROM calendar_availability
UNION ALL SELECT 'calendar_shares', count(*) FROM calendar_shares
UNION ALL SELECT 'recruiter_leads', count(*) FROM recruiter_leads
UNION ALL SELECT 'call_schedules', count(*) FROM call_schedules
UNION ALL SELECT 'call_logs', count(*) FROM call_logs
UNION ALL SELECT 'recruiter_availability', count(*) FROM recruiter_availability
UNION ALL SELECT 'reference_deletion_requests', count(*) FROM reference_deletion_requests
UNION ALL SELECT 'shift_requests', count(*) FROM shift_requests
UNION ALL SELECT 'vault_sign_templates', count(*) FROM vault_sign_templates
UNION ALL SELECT 'vault_sign_documents', count(*) FROM vault_sign_documents
UNION ALL SELECT 'vault_sign_signers', count(*) FROM vault_sign_signers
UNION ALL SELECT 'vault_sign_reminders', count(*) FROM vault_sign_reminders
UNION ALL SELECT 'document_verifications', count(*) FROM document_verifications
ORDER BY table_name;
