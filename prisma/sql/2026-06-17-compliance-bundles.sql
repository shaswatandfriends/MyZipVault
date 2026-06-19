-- ════════════════════════════════════════════════════════════════════
-- Compliance Bundles — Additive migration
-- Date: 2026-06-17
-- Author: Super Z
--
-- Purpose:
--   Creates a new table for agency-specific compliance bundles.
--   Agencies create their own bundles (no pre-seeded platform bundles).
--   Each org gets 5 free bundle slots (controlled via platform_settings).
--
-- Safety:
--   ✅ 100% ADDITIVE — new table only, no existing tables modified
--   ✅ Rollback: DROP TABLE "ComplianceBundle";
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "ComplianceBundle" (
  "id"                    SERIAL PRIMARY KEY,
  "organization_id"       INTEGER NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "name"                  VARCHAR(255) NOT NULL,
  "description"           TEXT,
  "profession"            VARCHAR(100),
  "specialty"             VARCHAR(100),
  "checklist_template_id" INTEGER NOT NULL REFERENCES "ChecklistTemplate"("id"),
  "documents"             TEXT NOT NULL DEFAULT '[]',
    -- JSON array: ["credential", "resume", "reference"]
    -- "checklist" can also be included to request the checklist itself via share request
  "credit_cost"           INTEGER NOT NULL DEFAULT 1,
    -- Calculated: 1 (for checklist request) + documents.length
  "is_active"             BOOLEAN NOT NULL DEFAULT true,
  "created_by"            INTEGER NOT NULL REFERENCES "User"("id"),
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ComplianceBundle_organization_id_active_idx"
  ON "ComplianceBundle"("organization_id", "is_active");

COMMIT;

-- ─── Verification ───────────────────────────────────────────────────
-- SELECT count(*) FROM "ComplianceBundle";  -- should return 0
