-- ════════════════════════════════════════════════════════════════════
-- Database Indexes — Additive migration (performance optimization)
-- Date: 2026-06-17
--
-- Purpose:
--   Adds indexes on commonly queried columns to improve read performance
--   as the platform scales. These are 100% ADDITIVE — no existing indexes
--   are dropped, no data is modified.
--
-- Safety:
--   ✅ 100% ADDITIVE — only creates new indexes
--   ✅ No data is read, modified, or deleted
--   ✅ Rollback: DROP INDEX <name>; (per index)
--   ✅ Uses IF NOT EXISTS — safe to run multiple times
--
-- Note: This database uses CamelCase table names (Organization, User, etc.)
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── consent_shares: queried on every recruiter dashboard load ───
-- Pattern: WHERE candidate_user_id = ? AND client_user_id IN (...) AND is_deleted = false
CREATE INDEX IF NOT EXISTS "ConsentShare_candidate_client_deleted_idx"
  ON "ConsentShare"("candidate_user_id", "client_user_id", "is_deleted");

-- ─── checklist_requests: queried on every candidate detail view ───
-- Pattern: WHERE candidate_user_id = ? AND client_user_id IN (...)
CREATE INDEX IF NOT EXISTS "ChecklistRequest_candidate_client_idx"
  ON "ChecklistRequest"("candidate_user_id", "client_user_id");

-- ─── unlocked_documents: queried on every unlock check ───
-- Pattern: WHERE client_user_id IN (...) AND consent_share_id = ?
CREATE INDEX IF NOT EXISTS "UnlockedDocument_client_share_idx"
  ON "UnlockedDocument"("client_user_id", "consent_share_id");

-- ─── notifications: queried on every page load ───
-- Pattern: WHERE user_id = ? AND is_read = false
CREATE INDEX IF NOT EXISTS "Notification_user_read_idx"
  ON "Notification"("user_id", "is_read");

-- ─── audit_logs: queried on audit trail views ───
-- Pattern: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS "AuditLog_user_created_idx"
  ON "AuditLog"("user_id", "created_at" DESC);

-- ─── credentials: queried for expiry checks ───
-- Pattern: WHERE reminder_enabled = true AND expiration_date BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS "Credential_expiry_reminder_idx"
  ON "Credential"("reminder_enabled", "expiration_date");

-- ─── candidate_references: queried for reference reminders ───
-- Pattern: WHERE status = 'pending_request' AND requested_at <= ?
CREATE INDEX IF NOT EXISTS "CandidateReference_status_requested_idx"
  ON "CandidateReference"("status", "requested_at");

-- ─── credentials: queried by candidate_user_id on dashboard ───
-- Pattern: WHERE candidate_user_id = ? ORDER BY uploaded_at DESC
CREATE INDEX IF NOT EXISTS "Credential_candidate_uploaded_idx"
  ON "Credential"("candidate_user_id", "uploaded_at" DESC);

-- ─── checklist_requests: queried by status for pipeline ───
-- Pattern: WHERE candidate_user_id = ? AND client_user_id IN (...) AND status NOT IN (...)
CREATE INDEX IF NOT EXISTS "ChecklistRequest_candidate_status_idx"
  ON "ChecklistRequest"("candidate_user_id", "status");

-- ─── system_error_logs: queried by severity on admin page ───
-- Pattern: WHERE severity = 'critical' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS "SystemErrorLog_severity_created_idx"
  ON "SystemErrorLog"("severity", "created_at" DESC);

-- ─── consent_shares: queried by expires_at for cleanup ───
-- Pattern: WHERE expires_at < ?
CREATE INDEX IF NOT EXISTS "ConsentShare_expires_idx"
  ON "ConsentShare"("expires_at");

COMMIT;

-- ─── Verification ───────────────────────────────────────────────────
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
-- Should show all the new indexes listed above.
