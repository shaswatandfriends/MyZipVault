-- ════════════════════════════════════════════════════════════════════
-- Backfill: Create RecruiterLead records for candidates who have
-- ChecklistRequests but no RecruiterLead.
--
-- This fixes the "Lead not found" error on the candidate detail page
-- for candidates who were sent checklist requests before the auto-create
-- feature was added.
--
-- Safe to run multiple times — only creates leads for candidates who
-- don't already have one.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- Find all distinct (candidate_user_id, client_user_id, organization_id)
-- combinations from ChecklistRequests where no RecruiterLead exists yet
-- for that candidate in that org.
INSERT INTO "RecruiterLead" (
  "recruiter_user_id",
  "organization_id",
  "candidate_user_id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "specialty",
  "source",
  "pipeline_stage",
  "tag",
  "is_active",
  "last_activity_at",
  "last_activity_type",
  "rtr_denial_count",
  "created_at",
  "updated_at"
)
SELECT
  cr.client_user_id,
  u.organization_id,
  cr.candidate_user_id,
  cu.first_name,
  cu.last_name,
  cu.email,
  cu.phone,
  ct.specialty,
  'other',
  'doc_pending',
  'warm',
  true,
  cr.created_at,
  'checklist_request_sent',
  0,
  NOW(),
  NOW()
FROM "ChecklistRequest" cr
JOIN "User" cu ON cu.id = cr.candidate_user_id
JOIN "User" u ON u.id = cr.client_user_id
JOIN "ChecklistTemplate" ct ON ct.id = cr.checklist_template_id
WHERE cr.candidate_user_id IS NOT NULL
  AND u.organization_id IS NOT NULL
  -- Only insert if no lead exists for this candidate in this org
  AND NOT EXISTS (
    SELECT 1 FROM "RecruiterLead" rl
    WHERE rl.candidate_user_id = cr.candidate_user_id
      AND rl.organization_id = u.organization_id
  )
GROUP BY cr.candidate_user_id, cr.client_user_id, u.organization_id, cu.first_name, cu.last_name, cu.email, cu.phone, ct.specialty, cr.created_at;

COMMIT;
