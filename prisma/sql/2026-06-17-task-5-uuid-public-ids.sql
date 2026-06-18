-- ════════════════════════════════════════════════════════════════════
-- Task 5: UUIDs for External-Facing IDs — Additive migration
-- Date: 2026-06-17
-- Author: Super Z (committed by Shaswat Pandey)
--
-- Purpose:
--   Adds a new `public_id UUID` column to 7 tables that are exposed via
--   external URLs or public APIs. The existing INT `id` column stays as
--   the primary key — zero risk to existing joins, queries, or URLs.
--
-- Why:
--   Sequential integer IDs allow enumeration attacks. E.g., if a candidate
--   sees their credential URL is /vault/credentials/42, they can try
--   /vault/credentials/43, /44, etc. UUIDs make this infeasible.
--
-- Tables affected (additive column only):
--   1. users                  — public profile URLs
--   2. organizations          — public agency directory
--   3. credentials            — public credential verification
--   4. candidate_references   — public reference form /reference/[token]
--   5. vault_sign_documents   — public signed document URL
--   6. vault_sign_signers     — public signing page /sign/[token]
--   7. invite_tokens          — invite links
--
-- Safety:
--   ✅ 100% ADDITIVE — adds a column, never modifies or drops existing
--   ✅ DEFAULT gen_random_uuid() NOT NULL — PostgreSQL auto-fills existing
--      rows during the ALTER (zero data loss, no manual backfill needed)
--   ✅ INT `id` stays as PRIMARY KEY — all existing joins/queries/URLs work
--   ✅ UNIQUE constraint on public_id — enables fast lookups
--   ✅ Rollback: ALTER TABLE <name> DROP COLUMN public_id; (per table)
--
-- Post-conditions:
--   - Every existing row has a non-null public_id UUID
--   - Every new row inserted gets an auto-generated UUID
--   - Prisma schema will be updated to add publicId field
--   - API routes will gradually start returning public_id alongside id
--   - Eventually external URLs will switch from /id to /public_id (old
--     routes will remain functional — no breaking changes)
-- ════════════════════════════════════════════════════════════════════

-- Enable pgcrypto extension for gen_random_uuid() (Supabase has this by default)
-- This is idempotent — safe to run multiple times
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ─── 1. users ────────────────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "public_id" UUID DEFAULT gen_random_uuid() NOT NULL;

-- Backfill any rows that somehow got NULL (defensive — DEFAULT NOT NULL should cover all)
UPDATE "users" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_public_id_unique"
  ON "users"("public_id");

-- ─── 2. organizations ────────────────────────────────────────────────
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "public_id" UUID DEFAULT gen_random_uuid() NOT NULL;

UPDATE "organizations" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_public_id_unique"
  ON "organizations"("public_id");

-- ─── 3. credentials ──────────────────────────────────────────────────
ALTER TABLE "credentials"
  ADD COLUMN IF NOT EXISTS "public_id" UUID DEFAULT gen_random_uuid() NOT NULL;

UPDATE "credentials" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "credentials_public_id_unique"
  ON "credentials"("public_id");

-- ─── 4. candidate_references ─────────────────────────────────────────
ALTER TABLE "candidate_references"
  ADD COLUMN IF NOT EXISTS "public_id" UUID DEFAULT gen_random_uuid() NOT NULL;

UPDATE "candidate_references" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "candidate_references_public_id_unique"
  ON "candidate_references"("public_id");

-- ─── 5. vault_sign_documents ─────────────────────────────────────────
ALTER TABLE "vault_sign_documents"
  ADD COLUMN IF NOT EXISTS "public_id" UUID DEFAULT gen_random_uuid() NOT NULL;

UPDATE "vault_sign_documents" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "vault_sign_documents_public_id_unique"
  ON "vault_sign_documents"("public_id");

-- ─── 6. vault_sign_signers ───────────────────────────────────────────
ALTER TABLE "vault_sign_signers"
  ADD COLUMN IF NOT EXISTS "public_id" UUID DEFAULT gen_random_uuid() NOT NULL;

UPDATE "vault_sign_signers" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "vault_sign_signers_public_id_unique"
  ON "vault_sign_signers"("public_id");

-- ─── 7. invite_tokens ────────────────────────────────────────────────
ALTER TABLE "invite_tokens"
  ADD COLUMN IF NOT EXISTS "public_id" UUID DEFAULT gen_random_uuid() NOT NULL;

UPDATE "invite_tokens" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "invite_tokens_public_id_unique"
  ON "invite_tokens"("public_id");

COMMIT;

-- ─── Verification queries (run manually to confirm) ──────────────────
-- Every row should have a non-null, unique public_id:

-- SELECT
--   (SELECT count(*) FROM users) AS users_total,
--   (SELECT count(*) FROM users WHERE public_id IS NULL) AS users_null,
--   (SELECT count(DISTINCT public_id) FROM users) AS users_distinct;
-- -- users_null should be 0, users_distinct should equal users_total

-- Same pattern for the other 6 tables — replace 'users' with:
-- organizations, credentials, candidate_references,
-- vault_sign_documents, vault_sign_signers, invite_tokens
