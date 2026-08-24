-- ─────────────────────────────────────────────────────────────────────
-- Migration: Create EmailUnsubscribe suppression list table
-- Date: 2026-08-24
-- Purpose: CAN-SPAM compliance — track unsubscribed emails and exclude
--          them from future campaign sends.
-- Safety:  100% additive — CREATE TABLE IF NOT EXISTS.
-- ROLLBACK:
--   DROP TABLE IF EXISTS "EmailUnsubscribe";
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "EmailUnsubscribe" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "source_campaign_id" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_email_unsubscribe_email"
  ON "EmailUnsubscribe" ("email");
