-- ════════════════════════════════════════════════════════════════════
-- Phase 5.1 — ResumeTemplate table + Resume.template_id + is_default_version
-- Date: 2026-09-11
--
-- Purpose:
--   Enables superadmin-managed resume templates (5 starter templates seeded).
--   Candidate can swap template per resume version; Version 1 is default
--   unless changed. When recruiter requests resume, default version auto-shares.
--
-- Schema changes:
--   1. CREATE TABLE "ResumeTemplate" (
--        id, name, description, layout_config (JSONB), is_active,
--        created_at, updated_at, updated_by
--      )
--   2. ALTER TABLE "Resume"
--        ADD COLUMN template_id        INTEGER REFERENCES "ResumeTemplate"(id)
--        ADD COLUMN is_default_version  BOOLEAN NOT NULL DEFAULT FALSE
--   3. Seed 5 starter templates (per EXECUTION-PLAN Phase 5.2):
--        - Classic Professional (Times New Roman, traditional)
--        - Modern Clean (Inter, navy/gray, minimal)
--        - Healthcare Standard (Calibri, blue accent)
--        - Compact One-Pager (Arial, dense)
--        - Executive (Georgia, serif headings)
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. ResumeTemplate table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ResumeTemplate" (
  "id"             SERIAL PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "layout_config"   JSONB NOT NULL,  -- fonts, colors, section order, spacing
  "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_by"      INTEGER REFERENCES "User"("id") ON DELETE SET NULL
);

-- ─── 2. Add resume_template_id + is_default_version to Resume ──────
-- NOTE: Resume already has a `template_id` STRING column (slug like
-- "clinical", "rn", "icu") used by older code. We add a NEW column
-- `resume_template_id` as the FK to ResumeTemplate to avoid clobbering.
ALTER TABLE "Resume"
  ADD COLUMN IF NOT EXISTS "resume_template_id"  INTEGER REFERENCES "ResumeTemplate"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "is_default_version"  BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for listing all templates in superadmin UI
CREATE INDEX IF NOT EXISTS "ResumeTemplate_is_active_idx"
  ON "ResumeTemplate"("is_active");

-- Index for finding a candidate's default resume quickly
CREATE INDEX IF NOT EXISTS "Resume_candidate_user_id_is_default_version_idx"
  ON "Resume"("candidate_user_id")
  WHERE "is_default_version" = TRUE;

-- ─── 3. Seed 5 starter templates ───────────────────────────────────
INSERT INTO "ResumeTemplate" ("name", "description", "layout_config", "is_active")
VALUES
  (
    'Classic Professional',
    'Traditional resume layout with Times New Roman typography. Best for conservative industries and formal applications.',
    '{"font_family":"Times New Roman, serif","font_size":12,"heading_color":"#000000","accent_color":"#333333","section_order":["contact","summary","experience","education","skills","certifications"],"spacing":"normal","page_margins":"1in"}',
    TRUE
  ),
  (
    'Modern Clean',
    'Minimal layout with Inter typography and navy/gray palette. Best for tech-forward roles and contemporary brands.',
    '{"font_family":"Inter, sans-serif","font_size":11,"heading_color":"#1e3a5f","accent_color":"#64748b","section_order":["contact","summary","skills","experience","education","certifications"],"spacing":"comfortable","page_margins":"0.75in"}',
    TRUE
  ),
  (
    'Healthcare Standard',
    'Healthcare-specific layout with Calibri typography and blue accents. Sections optimized for nursing/allied health: Licenses & Certs front-and-center.',
    '{"font_family":"Calibri, sans-serif","font_size":11,"heading_color":"#0b3d91","accent_color":"#3b82f6","section_order":["contact","licenses","experience","education","skills","certifications"],"spacing":"normal","page_margins":"0.75in"}',
    TRUE
  ),
  (
    'Compact One-Pager',
    'Dense Arial layout that fits on a single page. Best for candidates with 10+ years of experience who need to condense.',
    '{"font_family":"Arial, sans-serif","font_size":10,"heading_color":"#000000","accent_color":"#555555","section_order":["contact","summary","experience","education","skills"],"spacing":"tight","page_margins":"0.5in","max_pages":1}',
    TRUE
  ),
  (
    'Executive',
    'Elegant Georgia serif layout with refined typography. Best for C-suite, director, and senior leadership roles.',
    '{"font_family":"Georgia, serif","font_size":11.5,"heading_color":"#1a1a1a","accent_color":"#8b4513","section_order":["contact","executive_summary","core_competencies","experience","education","board_memberships","awards"],"spacing":"comfortable","page_margins":"1in"}',
    TRUE
  )
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification
SELECT id, name, is_active FROM "ResumeTemplate" ORDER BY id;

-- ─── Backfill: set resume_template_id=1 (Classic Professional) on existing resumes
-- that don't yet have a resume_template_id. Sets is_default_version=FALSE on all
-- existing resumes — candidate can promote one to default via UI.
UPDATE "Resume"
SET "resume_template_id" = 1
WHERE "resume_template_id" IS NULL;
