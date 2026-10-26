# MyZipVault — Audit & Root-Cause Register (Batch B2)

Date: 2026-10-26 · Scope: full route inventory (147 pages), sensitive-API surface (~30 routes sampled in depth), middleware auth matrix, ownership-rule verification, consent/cross-user access paths.
Method: static audit (two parallel code sweeps) + runtime probes (curl/browser) + DB inspection. No production data exists anywhere (seed-only, synthetic).

---

## 1. Capability classification (summary)

| Area | State | Evidence |
|---|---|---|
| Page routes (147) | **Working** — 0 broken imports; 1 intentional redirect stub; 1 dead duplicate removed; 1 orphan flagged | resolver sweep, route table |
| Auth (login/signup/recovery/verify) | **Working E2E** (browser-verified candidate login; seeded roles all reachable) | Batch 1 + this batch probes |
| Candidate vault (credentials/resume) | **Working** — scoped queries throughout; upload validation strong (10 MB, magic bytes, allowlist) | API audit |
| Sharing/consent lifecycle | **Working** with one systemic gap — expiry/revocation not enforced on read paths → **fixed this batch** | §2 D1 |
| Recruiter document access | **Working** (org-scoped) with same expiry gap → **fixed this batch** | §2 D1 |
| Reference workflow | **Broken-unsafe** (public IDOR) → **fixed this batch** (UUID links) | §2 D2 |
| Checklist serving | **Partially unsafe** (PDF + responseId + remind lacked ownership) → **fixed this batch** | §2 D3 |
| VaultSign | Working; upload MIME check weak → **fixed this batch** (magic bytes) | §2 D5 |
| Ownership windows (marketplace) | **Implemented but conflicts with the rule of record (R6)** — disposition §3 | schema + routes |
| Credits/billing surfaces | Present but dormant by decision (free launch, R5) — Stripe keys absent; UI stays unactivated | DECISION-REGISTER R5 |
| Email delivery | **Blocked on owner inputs** (Brevo key + DNS) — no fake delivery claims | §5 |

## 2. Defects fixed this batch (with root cause)

**D1 — ConsentShare expiry/revocation never enforced (systemic, P0).**
Root cause: the share model gained `is_deleted` + `expires_at`, and the *listing/revoke* paths honored them, but every *read* path (unlock, resume view, download-packet, signed-url, scope checks) queried without them — so a candidate's revocation cut nothing off.
Fix: all five read paths now require `is_deleted: false AND expires_at > now`; revoked/expired shares return 410/403, including for previously-unlocked documents.

**D2 — Public reference IDOR (worst finding, P0).**
Root cause: schema already had `public_id` UUID "used in public reference form URL" per its own comment — but the API and email links used the enumerable INT id instead. Anyone could walk `/api/reference/1..N`: read candidate/manager PII and forge reference responses.
Fix: route lookups (GET+POST) by `public_id` only; non-UUID input → clean 404; email links now built from `public_id`; internal id used only for writes. Verified: numeric → 404, UUID → 200 (probes in worklog).

**D3 — Checklist serving without ownership (P0).**
Root cause: `/api/checklists/[id]/pdf` (signed PDF with candidate name/email/signature), `?responseId=` ratings, and `/remind` (triggers emails to candidates) trusted the session role alone — any recruiter could target any candidate's records.
Fix: PDF + remind now require the requesting recruiter's org scope to match `checklist_request.client_user_id` (admins bypass); `responseId` requires the owning candidate or the requesting recruiter.

**D4 — `/unsubscribe` login-walled (P1).**
Root cause: page + its API are public by design; the page route was never added to `publicRoutes`. Email recipients logged-out were bounced to `/login`.
Fix: added to `publicRoutes` (verified 200 logged-out).

**D5 — VaultSign upload trusted the extension (P1).**
Root cause: credentials upload got magic-byte validation in an earlier hardening pass; VaultSign's upload never did.
Fix: `%PDF-` magic-byte check added (same standard as credentials).

**D6 — Dead duplicate page (hygiene).**
`/calendar/shared/[token]` (legacy, never linked, wrongly candidate-gated) removed; live share link is `/shared/calendar/[token]` (public prefix). Recoverable from git.

**D7 — Onboarding state dropdown looked pre-filled (P1, found during owner-requested verification).**
Root cause: `<SelectValue placeholder="TX" />` on `/onboarding/details` — with nothing selected, the empty state Select displayed "TX", so candidates believed a state was chosen, submitted, and got `400 Missing required fields: state`. Reproduced live (PUT 400 → toast), root-caused, fixed (placeholder → "Select a state"), and re-verified E2E: fill → select IL → submit → 200 → redirect `/dashboard`.

## 2b. Owner-requested changes this batch (B2 follow-up)

**Dual social feed on the landing page.** Owner instruction: both the VaultProfessional and VaultRecruiter feeds must sit in the middle of the landing page with demo content. Implemented: `SocialFeed` rebuilt as two labeled side-by-side feed columns (2 demo posts each — professionals + recruiters, engagement counts, topic pills), Communities converted to a horizontal strip below, and the section moved to the exact middle position (05 of 10 content sections; swapped with Verification). Verified desktop (1920) + mobile (390) via screenshots + VLM; no overflow/misalignment.

**"Switch workspace — Recruiter workspace" in candidate login — investigated, NOT an app defect.**
Owner reported seeing this in the candidate login. Exhaustive verification: (1) no `workspace` string anywhere in `src/` (147 pages + all components); (2) not in DB-driven UI content (banners/notifications/announcements — queried via Prisma); (3) never existed in the repo's 834-commit history (`git grep` across all revs); (4) live candidate dashboard inspected via screenshot + VLM — no such element; sidebar is candidate-only (Dashboard, Browse Jobs, Checklists, Calendar, VaultSign, Credentials, Resume, References, Sharing, Settings). Conclusion: the control is **platform preview chrome** (the preview-URL wrapper's own workspace switcher), not MyZipVault UI. If it appears again: note whether it sits outside the app viewport / persists across scroll — that confirms platform chrome.

## 3. Recorded conflicts & dispositions (not fixed this batch)

**C1 — Ownership window semantics vs rule of record (R6).**
Code: window created at candidate-record creation (Path B), 90-day exclusive (invisible to others) + 90-day residual, with stored payout splits (75/25, 68/30/2, 70/30).
Rule of record (master command §9): ownership begins at the **qualifying candidate-introduction dispatch**, lasts exactly **180×24h**, no resets, no countdowns, candidates remain visible to other eligible recruiters, and no commercial math is active (free launch).
Disposition: **behavioral fix scheduled for B4** (single deliberate change, not mixed into security batch). Meanwhile: no split math executes anywhere (Stripe dormant; percentages are stored defaults only), and no countdown UI exists (grep-verified). Marketing pages describing splits are flagged for B4 public-accuracy pass.

**C2 — Public recruiter profiles are login-walled.**
`/recruiter/[publicId]` and orphan `/r/[publicId]` both redirect unauthenticated visitors to `/agency-login`, contradicting the middleware's own comment. Disposition: B4 (decide: true-public profiles vs auth-walled; remove orphan route).

**C3 — `platform_admin` sees candidate PII** (documents queue, candidates list incl. NPI/license).
Disposition: owner confirmation requested (recorded in DECISION-REGISTER §1.3 follow-ups); no change made without approval.

**C4 — Schema-drift `@ts-nocheck` files** (legacy calendar/vaultsign/pdf code).
Disposition: B3/B4 — fix individually when touching each surface; never widen the suppressions.

## 4. Root causes of the project's delay (evidence-backed)

1. **No verification loop.** A fatal CSS defect (all routes 500) shipped to GitHub while the same period produced cosmetic commit loops ("165+ buttons", "NUCLEAR FIX", repeated glass-style rewrites). Nobody ran the app.
2. **Shared-component fragility.** A 10.8k-line hand-built `globals.css` + per-screen inline style patches instead of tokens/shared components — every visual tweak risked global breakage, spawning the fix-of-the-fix cycles visible in git history.
3. **Spec churn without implementation.** EXECUTION-PLAN/TODO kept approving new features (messaging, bonus jobs, referral, templates) while base journeys lacked E2E verification; planning artifacts multiplied (7 planning files) faster than shipped behavior.
4. **Commercial surfaces built ahead of the free-launch decision.** Credits, splits, payout percentages, and billing UI exist in schema/UI but are unusable — half-built surfaces that look unfinished because they *are* unfinished by policy.
5. **Route hygiene decay.** Duplicates (`/r/` vs `/recruiter/`, two calendar-share routes, `onboard` vs `onboarding`, `reference` vs `references`) accumulated without a registry — navigation and middleware gates drifted from reality.

## 5. Verified-working list (this batch)

- Middleware: role matrix, rate limiting (120/300 rpm), public prefixes — reviewed in full; one fix (D4).
- Consent lifecycle: approve/deny/revoke/modify-expiry all candidate-scoped and session-checked.
- Superadmin surface: every sampled route re-verifies role in-handler; bulk-PII endpoints paginated + audited; proxy-login guarded (1h window, audited, cannot target super_admin).
- Uploads (credentials): size/extension/magic-byte validation — strong.
- VaultSign signer token flow — correct pattern (used as model for D2).
- Reference form via UUID: 200; completion path intact; manager auto-vault creation preserved.
- Candidate onboarding E2E (post-D7): login → onboarding form → submit → dashboard redirect — verified in browser.
- Landing dual feed: both feeds render with demo content; responsive single-column on mobile.

## 6. Gate status

**Gate A (baseline established): COMPLETE** — repository/branch confirmed (main @ 5f6337e → this batch), build/start result recorded (dev server, GET / 200), features classified (§1), P0/P1 scope set (DECISION-REGISTER §2), existing work preserved (governance repo intact; no destructive git operations).

Remaining for release: Gate B (visual system, B3) → Gate C (core journeys, B4) → Gate D (release candidate, B5).
