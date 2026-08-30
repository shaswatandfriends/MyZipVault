-- ─────────────────────────────────────────────────────────────────────
-- MyZipVault — Welcome Sequence + Automated Email Tracking
-- Created: 2026-08-28
--
-- Adds:
--   1. 5 welcome sequence email templates
--   2. AutomatedEmailLog table — tracks every automated email sent,
--      preventing duplicates and enabling analytics
--
-- Safety: idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1. Insert welcome email templates (idempotent via ON CONFLICT) ───
-- The EmailTemplate table has a unique constraint on template_key.
-- We use ON CONFLICT to make this re-runnable.
-- Note: EmailTemplate schema has (id, template_key, subject, body, updated_by, updated_at) — no created_at.

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'welcome_day0',
    'Welcome to MyZipVault — verify your email to get started',
    '<p>Hi {{candidate_name}},</p>
<p>Welcome to MyZipVault! We''re thrilled to have you.</p>
<p>MyZipVault is the healthcare recruiting marketplace where candidates, recruiters, and employers connect. Here''s what you can do:</p>
<ul>
<li><strong>Browse open jobs</strong> — travel nurse, RN, allied health, and more</li>
<li><strong>Verify your credentials once</strong> — apply to any job with one click</li>
<li><strong>Sign documents electronically</strong> — contracts, BAAs, compliance forms</li>
<li><strong>Get job alerts</strong> — we''ll email you when matching jobs are posted</li>
</ul>
<p><strong>First step:</strong> verify your email address by clicking the link below:</p>
<p><a href="{{verification_link}}" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Verify My Email</a></p>
<p>This link expires in 24 hours.</p>
<p>Questions? Reply to this email or visit our <a href="https://my-zip-vault.vercel.app/support">support center</a>.</p>
<p>Welcome aboard,<br>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'welcome_day1',
    'Top 10 healthcare jobs hiring now in your area',
    '<p>Hi {{candidate_name}},</p>
<p>Here are 10 high-paying healthcare jobs actively hiring on MyZipVault right now:</p>
{{top_jobs_list}}
<p><strong>Average pay:</strong> $2,500–$4,000/week for travel nurse contracts<br>
<strong>Top specialties:</strong> ICU, ER, OR, Labor &amp; Delivery, Cath Lab</p>
<p>To apply, complete your profile on MyZipVault. Once your credentials are verified, you can apply to any job with one click.</p>
<p><a href="https://my-zip-vault.vercel.app/browse-jobs" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Browse All Jobs</a></p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'welcome_day3',
    'How MyZipVault works — meet your recruiter',
    '<p>Hi {{candidate_name}},</p>
<p>Wondering how MyZipVault works? Here''s the short version:</p>
<ol>
<li><strong>You create a profile</strong> — upload your credentials, license, and resume</li>
<li><strong>We verify your credentials</strong> — usually within 24 hours</li>
<li><strong>You browse open jobs</strong> — filter by specialty, location, pay</li>
<li><strong>You apply with one click</strong> — your verified profile goes straight to the recruiter</li>
<li><strong>The recruiter reaches out</strong> — directly, no middleman</li>
<li><strong>You get hired</strong> — sign your contract electronically on MyZipVault</li>
</ol>
<p>Unlike traditional agencies, MyZipVault is a <strong>marketplace</strong> — multiple recruiters compete for your placement, so you get the best offers.</p>
<p><strong>Pro tip:</strong> Complete your profile to 100% to rank higher in recruiter searches. Profiles with photos, full work history, and verified credentials get 3x more recruiter views.</p>
<p><a href="https://my-zip-vault.vercel.app/settings" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Complete My Profile</a></p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'welcome_day7',
    '7 tips to ace your next healthcare interview',
    '<p>Hi {{candidate_name}},</p>
<p>You''ve been on MyZipVault for a week — hopefully you''ve applied to a few jobs by now. When a recruiter reaches out, here''s how to nail the interview:</p>
<ol>
<li><strong>Research the facility</strong> — know their specialty, bed count, and recent news</li>
<li><strong>Prepare clinical scenarios</strong> — expect "tell me about a time you handled a difficult patient"</li>
<li><strong>Have your credentials ready</strong> — license, BLS/ACLS, immunization records</li>
<li><strong>Ask smart questions</strong> — nurse-to-patient ratio, orientation length, EMR system</li>
<li><strong>Know your worth</strong> — check market rates for your specialty/location on our <a href="https://my-zip-vault.vercel.app/blog/travel-nurse-salary-by-state-2026">salary guide</a></li>
<li><strong>Negotiate</strong> — most facilities have 8-12% wiggle room on bill rate</li>
<li><strong>Follow up</strong> — send a thank-you email within 24 hours</li>
</ol>
<p>Success story: <em>"I applied to 3 travel nurse contracts on MyZipVault, got calls from 2 recruiters within 48 hours, and was offered both. I picked the higher-paying one and started 2 weeks later."</em> — Sarah K., ICU RN</p>
<p><a href="https://my-zip-vault.vercel.app/browse-jobs" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Browse Open Jobs</a></p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'welcome_day14_reengage',
    'We miss you — here''s what you''re missing',
    '<p>Hi {{candidate_name}},</p>
<p>We noticed you haven''t logged into MyZipVault in a while. Here''s what''s new:</p>
<ul>
<li><strong>{{new_jobs_count}} new jobs</strong> have been posted since you last visited</li>
<li>Recruiters are actively looking for candidates in your specialty</li>
<li>Average pay is up 8% from last month</li>
</ul>
<p>It takes 2 minutes to update your profile and start applying.</p>
<p><a href="https://my-zip-vault.vercel.app/login" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Log In Now</a></p>
<p>If you have feedback or need help, just reply to this email — we read every reply.</p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

-- ─── 2. Profile completion nudge templates ───

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'profile_nudge_25',
    'Quick: add your license to boost your profile',
    '<p>Hi {{candidate_name}},</p>
<p>Your MyZipVault profile is 25% complete. The #1 thing missing? Your nursing license.</p>
<p>Recruiters can''t submit you to jobs without a verified license. Adding it takes 2 minutes:</p>
<ol>
<li>Log in to MyZipVault</li>
<li>Go to Credentials → Add License</li>
<li>Upload a photo or PDF of your license</li>
<li>We verify it within 24 hours</li>
</ol>
<p><a href="https://my-zip-vault.vercel.app/vault/credentials" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Add My License</a></p>
<p>Profiles with verified licenses get <strong>5x more recruiter views</strong>.</p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'profile_nudge_50',
    'Halfway there — add your resume to unlock more jobs',
    '<p>Hi {{candidate_name}},</p>
<p>You''re 50% done with your profile. The next big win? Upload your resume.</p>
<p>Recruiters use your resume to:
<ul>
<li>Verify your clinical experience</li>
<li>Match you to contracts in your specialty</li>
<li>Submit you to facilities faster</li>
</ul>
</p>
<p><a href="https://my-zip-vault.vercel.app/settings" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Upload My Resume</a></p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'profile_nudge_75',
    'Almost there — add references to unlock premium jobs',
    '<p>Hi {{candidate_name}},</p>
<p>Your profile is 75% complete — just one thing left: references.</p>
<p>Most premium contracts (Cath Lab, OR, high-paying travel assignments) require 2-3 references from recent supervisors. Adding them now means you''re ready to apply the moment a great contract opens.</p>
<p><a href="https://my-zip-vault.vercel.app/references" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Add References</a></p>
<p>Once you hit 100%, you''ll get a "verified" badge that boosts your visibility in recruiter searches.</p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

-- ─── 3. Re-engagement template (30 days inactive) ───

INSERT INTO "EmailTemplate" (template_key, subject, body, updated_at)
VALUES
  (
    'reengage_30d',
    'It''s been a while — see what''s new on MyZipVault',
    '<p>Hi {{candidate_name}},</p>
<p>You haven''t logged into MyZipVault in 30 days. We wanted to check in.</p>
<p>Since you were last here:
<ul>
<li>{{new_jobs_count}} new jobs were posted in your specialty</li>
<li>{{new_recruiters_count}} new recruiters joined the platform</li>
<li>Average pay increased by 8%</li>
</ul>
</p>
<p>Log in to see what you''ve been missing:</p>
<p><a href="https://my-zip-vault.vercel.app/login" style="background-color:#be123c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Log In to MyZipVault</a></p>
<p>If you found a job elsewhere — congratulations! If you''re still looking, we''d love to help. Just reply to this email and tell us what you need.</p>
<p>The MyZipVault Team</p>',
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = NOW();

-- ─── 4. AutomatedEmailLog table ──────────────────────────────────────
-- Tracks every automated email sent to prevent duplicates and enable analytics.
-- One row per (user_id, sequence, step) — UNIQUE constraint prevents re-sends.

CREATE TABLE IF NOT EXISTS "AutomatedEmailLog" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  sequence TEXT NOT NULL,           -- 'welcome', 'profile_nudge', 'reengage'
  step TEXT NOT NULL,                -- 'day0', 'day1', 'day3', 'day7', 'day14', 'nudge_25', etc.
  template_key TEXT NOT NULL,        -- 'welcome_day0', 'profile_nudge_25', etc.
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Prevent duplicate sends: one email per (user, sequence, step)
  UNIQUE (user_id, sequence, step)
);

CREATE INDEX IF NOT EXISTS "idx_automated_email_log_user" ON "AutomatedEmailLog"(user_id);
CREATE INDEX IF NOT EXISTS "idx_automated_email_log_sequence" ON "AutomatedEmailLog"(sequence, step);
CREATE INDEX IF NOT EXISTS "idx_automated_email_log_sent_at" ON "AutomatedEmailLog"(sent_at);

COMMIT;

-- ─── Verify ──────────────────────────────────────────────────────────
SELECT 'EmailTemplate count after insert:' as info, COUNT(*) as count FROM "EmailTemplate"
WHERE template_key LIKE 'welcome_%' OR template_key LIKE 'profile_nudge_%' OR template_key = 'reengage_30d';

SELECT 'AutomatedEmailLog table created:' as info, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'AutomatedEmailLog';
