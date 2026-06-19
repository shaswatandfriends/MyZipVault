-- ════════════════════════════════════════════════════════════════════
-- BOB Phase 2: contract_start_date + contact request tracking
-- Date: 2026-06-20
--
-- Purpose:
--   1. contract_start_date — for onAssignmentStarted automation (cron
--      checks this daily; when the date arrives, auto-flip to On Assignment)
--   2. requested_email_at — tracks when recruiter requested candidate's email
--   3. requested_phone_at — tracks when recruiter requested candidate's phone
--   4. requested_calendar_at — tracks when recruiter requested calendar access
--
-- Safety:
--   ✅ 100% ADDITIVE — new columns only, all nullable
--   ✅ No existing data modified
--   ✅ Rollback: ALTER TABLE ... DROP COLUMN
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "contract_start_date" TIMESTAMP(3);

ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "requested_email_at" TIMESTAMP(3);

ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "requested_phone_at" TIMESTAMP(3);

ALTER TABLE "RecruiterLead"
  ADD COLUMN IF NOT EXISTS "requested_calendar_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "RecruiterLead_contract_start_date_idx"
  ON "RecruiterLead"("contract_start_date")
  WHERE "contract_start_date" IS NOT NULL;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "contract_start_date";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "requested_email_at";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "requested_phone_at";
-- ALTER TABLE "RecruiterLead" DROP COLUMN IF EXISTS "requested_calendar_at";
-- COMMIT;
