-- ════════════════════════════════════════════════════════════════════
-- Update email templates: terracotta (#D98F78) → gold (#C9A961)
-- Date: 2026-09-23
--
-- Updates all email templates to use the new gold accent color
-- instead of the old terracotta. Also updates the primary teal
-- from #174A43 → #0D3B2E (darker forest teal).
--
-- Run in Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- Replace terracotta with gold in all email templates
UPDATE "EmailTemplate" SET
  body = REPLACE(body, '#D98F78', '#C9A961'),
  subject = REPLACE(subject, '#D98F78', '#C9A961')
WHERE body LIKE '%#D98F78%' OR subject LIKE '%#D98F78%';

-- Replace old teal with new darker forest teal
UPDATE "EmailTemplate" SET
  body = REPLACE(body, '#174A43', '#0D3B2E'),
  subject = REPLACE(subject, '#174A43', '#0D3B2E')
WHERE body LIKE '%#174A43%' OR subject LIKE '%#174A43%';

-- Replace old teal hover with new darker hover
UPDATE "EmailTemplate" SET
  body = REPLACE(body, '#0F3631', '#082820')
WHERE body LIKE '%#0F3631%';

COMMIT;

-- Verification
SELECT
  template_key,
  CASE
    WHEN body LIKE '%#0D3B2E%' AND body LIKE '%#F7F3E8%' AND body LIKE '%#C9A961%' THEN '✅ New Palette'
    WHEN body LIKE '%#D98F78%' OR body LIKE '%#174A43%' THEN '❌ Old Palette'
    ELSE '⚠️ Unknown'
  END AS palette_status
FROM "EmailTemplate"
ORDER BY template_key;
