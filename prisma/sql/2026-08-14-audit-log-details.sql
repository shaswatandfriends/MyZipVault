-- ───────────────────────────────────────────────────────────────────
-- Migration: Add details column to AuditLog table
-- Date: 2026-08-14
-- Purpose: Store a human-readable description of each audit event
--
-- This is 100% ADDITIVE — no existing data is touched.
-- Run this in Supabase SQL Editor.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS details TEXT;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'AuditLog'
  AND column_name = 'details';

-- ───────────────────────────────────────────────────────────────────
-- ROLLBACK:
-- ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS details;
-- ───────────────────────────────────────────────────────────────────
