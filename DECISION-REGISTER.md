# MyZipVault — Canonical Decision Register & Recovery Schedule

Created: 2026-10-26, per the Master Execution Command (Shaswat Pandey, Owner).
Supersedes: fragmented statuses across EXECUTION-PLAN.md, TODO-*, and the governance decision pack (preserved at `/home/z/my-project/bts-governance/`).
Rule of record: statuses are **Approved / Provisional / Owner Input Required / Superseded / Blocked**. Nothing is marked complete without evidence.

---

## 1. Decision Register (reconciled)

### 1.1 Supplied by the Master Execution Command (Approved unless noted)

| # | Decision | Status | Implementation consequence |
|---|----------|--------|-----------------------------|
| R1 | Official domain `behindthescrub.com` | **Approved** (domain identity) / **Owner Input Required** (DNS + email delivery verification) | Use everywhere; replace myzipvault.com references in product copy |
| R2 | Contact addresses: `info@behindthescrub.com` (general/legal/privacy), `sam@behindthescrub.com` (sales/contact-us) | **Approved** (addresses) / **Owner Input Required** (mailbox setup + SPF/DKIM/DMARC verification) | Contact page + templates; no other addresses may be invented |
| R3 | Transactional email sender `no-reply@behindthescrub.com` (Brevo) | **Provisional** — technical sender, not a contact address; needs owner confirmation + DNS auth | `.env` value set; email delivery unverifiable until Brevo key + DNS exist |
| R4 | Preserve existing stack (Next.js/TS/Prisma/PostgreSQL/NextAuth); no migration to follow old proposals | **Approved** | Prisma stays (typed data-access layer requirement satisfied); Drizzle migration cancelled |
| R5 | Free launch: no charges, credits, payouts, pricing anywhere | **Approved** (consistent with governance D-28) | Stripe code stays dormant (no keys); credit-system UI hidden or marked unavailable; no payout engine |
| R6 | Candidate-ownership rule: starts at qualifying introduction dispatch; exactly 180×24h; no resets; no countdowns; candidate never "property" | **Approved** (rule of record) | Audit must verify implementation matches (Batch 2) |
| R7 | Proctoring (camera/mic) | **Blocked/Disabled** pending privacy/fairness review | Verification = ID/document checks only in first release |
| R8 | Visual direction: clean professional healthcare SaaS — white/light-gray, restrained teal, dark readable text, WCAG 2.2 AA | **Approved** — **supersedes the "glass dark green/gold" styling era** | Batch 3: design tokens + restyle release-critical screens |
| R9 | Budget ≤ ₹5,000/yr recurring (excl. domain/fees) | **Approved** (target) | Local embedded Postgres = ₹0; production hosting = Supabase free tier (standing candidate, this app already targets it) — verify against budget before any paid commitment |
| R10 | Parent brand: Behind the Scrub; product: MyZipVault; tagline "More than a title. A person." | **Approved** | Apply in copy; no cross-product feature marketing |
| R11 | Team: owner (Shaswat) + autonomous engineer agent; external specialists gated | **Approved** | Security/legal/accessibility reviews scheduled as gates |
| R12 | Dev/test data = synthetic only (seed) | **Approved** (in force) | Seed users exist only in local dev DB |

### 1.2 Deferred by the Master Command (not first-release scope)

Bonus jobs (70/75%), in-app messaging, referral expansion, resume formatter, split-fee, non-healthcare categories, PDF converter — **Superseded for first release** (P3); earlier EXECUTION-PLAN "final decisions" stand as planning approvals only; any money math stays disabled per R5.

### 1.3 Still owner-gated (recorded, never fabricated)

| Item | Why needed | Blocks |
|------|-----------|-------|
| P-01 legal entity name/address | Publication of legal docs | Terms/Privacy publication (launch copy uses reviewable drafts) |
| P-02 governing law/courts | ToS/Privacy clauses | Same |
| P-05 retention legal review | Data-retention terms | Privacy page final wording |
| Logo final assets | Brand consistency | Keep existing logo until supplied |
| DNS/email delivery verification (SPF/DKIM/DMARC) + Brevo key | Real email | Email-dependent flows; use clearly-labeled test adapter meanwhile |
| Production hosting decision | Launch | Supabase free tier = standing candidate (R9) |

---

## 2. Release scope freeze (first release)

**Included (P0 → P1):**
1. ✅ P0: application runs (CSS import defect fixed — app did not run as pushed).
2. P0: remaining runtime error triage (dev.log `⨯` entries), authorization/consent verification, cross-user access checks.
3. P1: candidate journey — signup, login, onboarding, profile, credentials, checklists, resume, sharing/consent + revocation, notifications.
4. P1: recruiter journey — signup, verification, discovery, send request, status, authorized document access only.
5. P1: public site accuracy (remove unsupported claims; live-vs-planned classification), Contact Us wiring (R2), legal/privacy pages as reviewable drafts.
6. P1: visual system per R8 on release-critical screens; responsive; WCAG 2.2 AA effort.
7. P1: email — real path when credentials exist; otherwise clearly-labeled test adapter (never pretend delivery).

**Excluded (P2):** analytics dashboards, advanced automation, VaultSign deep polish (verify only), cosmetic perfection.
**Excluded (P3):** bonus jobs, messaging, referral expansion, other BTS products, any paid feature.

---

## 3. Execution schedule (batches — order fixed, no invented dates)

> Working cadence: one batch = one or more sessions, each ending in a committed, testable checkpoint. "Launch soon" is honored by scope discipline (§2), not by skipping verification.

| Batch | Outcome | Exit evidence | Gate |
|-------|---------|---------------|------|
| **B1 — Recovery & baseline** ✅ | App restored from GitHub, DB up, seed loaded, app runs | 200 on `/`; login E2E ok; commit 9bbe310 | Gate A (partial) |
| **B2 — Audit & root causes** | Full route/capability classification; the 15 `⨯` log entries triaged; auth matrix; ownership-rule (R6) code verification; decision register v1 committed | Capability table + defect register with severity + smallest safe fix each | **Gate A complete** |
| **B3 — Visual system** | Design tokens (R8) applied to release-critical screens; glass era retired; shared components fixed at root | Desktop+mobile screenshots of every release-critical screen; no unexplained states | **Gate B** |
| **B4 — Core journeys** | Candidate + recruiter journeys E2E incl. denial/expiry/invalid-input/concurrent cases; consent + revocation verified; public site accuracy; contact page live | E2E test log; public-claims audit table (live/planned) | **Gate C** |
| **B5 — Release candidate** | Security/privacy pass (authz matrix tests, upload validation, env isolation), responsive+a11y checks, known-issues register, preview demonstration | §15 evidence report to owner; owner release approval | **Gate D → RC** |

**Launch-blocking owner inputs:** §1.3 table. Everything else proceeds independently.
