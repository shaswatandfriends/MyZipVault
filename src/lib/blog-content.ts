/**
 * Blog / Resources content — single source of truth.
 *
 * Posts are stored as TypeScript constants (not in the database) so:
 *   - Content is versioned via git (reviewable via PR)
 *   - No DB schema migration needed
 *   - No admin UI needed (edit via git push)
 *   - SEO-friendly: posts render as static pages with proper metadata
 *
 * To add a new post:
 *   1. Add a new object to the `blogPosts` array below
 *   2. Run `next build` to verify
 *   3. Commit & push — the new post is live at /blog/<slug>
 *
 * Frontmatter fields:
 *   - slug: URL path (e.g., 'how-to-become-travel-nurse' → /blog/how-to-become-travel-nurse)
 *   - title: H1 title (also used as meta title)
 *   - excerpt: 1-2 sentence summary shown in the listing
 *   - category: 'Career' | 'Compliance' | 'Recruiting' | 'Marketplace' | 'Tech'
 *   - author: name (e.g., 'MyZipVault Team')
 *   - author_role: subtitle (e.g., 'Editorial Team')
 *   - published_at: ISO date string (e.g., '2026-08-23')
 *   - reading_time_minutes: estimated read time
 *   - cover_emoji: single emoji used as the cover (avoids needing image hosting)
 *   - body: array of blocks — see BlogBlock type below
 */

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "callout"; variant: "info" | "warning" | "success"; title: string; text: string };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: "Career" | "Compliance" | "Recruiting" | "Marketplace" | "Tech";
  author: string;
  author_role: string;
  published_at: string; // ISO date
  reading_time_minutes: number;
  cover_emoji: string;
  body: BlogBlock[];
}

// ─── Helper: format date for display ─────────────────────────────────
export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Posts ─────────────────────────────────────────────────────────────
export const blogPosts: BlogPost[] = [
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "what-is-right-to-represent",
    title: "What is a Right to Represent (RTR) — and why it matters",
    excerpt: "An RTR is the document that proves a recruiter has your consent to submit you to a job. Here's what to look for, what to avoid, and how MyZipVault's VaultSign RTR makes the process painless.",
    category: "Compliance",
    author: "MyZipVault Team",
    author_role: "Editorial Team",
    published_at: "2026-08-23",
    reading_time_minutes: 6,
    cover_emoji: "✍️",
    body: [
      { type: "p", text: "If you've ever worked with a healthcare recruiter, you've been asked to sign a Right to Represent (RTR). It's one of the most common — and most misunderstood — documents in the staffing industry. Let's break down what it is, why it exists, and what you should look for before signing." },
      { type: "h2", text: "What is an RTR?" },
      { type: "p", text: "A Right to Represent is a written agreement between a candidate and a recruiter that authorizes the recruiter to submit the candidate's profile to a specific job at a specific employer. It typically includes the candidate's name, the job title, the employer's name, the recruiter's name, and a timestamp." },
      { type: "p", text: "The RTR exists because employers often work with multiple recruiting agencies. If two recruiters submit the same candidate for the same job, the employer needs a way to determine who 'owns' that submission — and therefore who is owed a placement fee if the candidate is hired. The RTR is the evidence that the candidate authorized a specific recruiter to represent them." },
      { type: "h2", text: "Why it matters" },
      { type: "p", text: "Without an RTR, you risk being submitted to the same job by multiple recruiters. This creates confusion for the employer, can delay your application, and — worst case — can lead to a 'fee dispute' where two recruiters both claim the placement. A clean RTR eliminates that ambiguity." },
      { type: "callout", variant: "warning", title: "Watch out for broad RTRs", text: "Some recruiters will ask you to sign an RTR that covers 'all jobs at this employer' or 'any job you're qualified for.' Avoid these. A legitimate RTR should name a specific job (or specific job IDs). Broad RTRs can lock you out of working with other recruiters for months." },
      { type: "h2", text: "What to look for before signing" },
      { type: "ul", items: [
        "Job title and job ID (specific, not 'all open roles')",
        "Employer name (the actual hospital or facility, not the agency)",
        "Recruiter name and contact info",
        "Expiration date (RTRs typically expire in 30-90 days)",
        "Your signature (electronic signatures are fine — see VaultSign below)",
        "Timestamp (when you signed, not just when the recruiter sent it)",
      ] },
      { type: "h2", text: "How VaultSign makes RTRs painless" },
      { type: "p", text: "On MyZipVault, RTRs are signed electronically through VaultSign — our built-in e-signature platform. When a recruiter sends you an RTR, you receive an email with a link to review the document and sign on your phone. The signature includes a timestamp, IP address, device info, and a SHA-256 hash of the document — all stored permanently in an audit trail." },
      { type: "p", text: "This means: no more printing, scanning, and emailing PDFs. No more 'did you sign it?' back-and-forth. And critically — no more ambiguity about whether you actually authorized a submission. The audit trail is ironclad." },
      { type: "callout", variant: "info", title: "Did you know?", text: "VaultSign RTRs are legally binding under the ESIGN Act and UETA. Each signature includes timestamp, IP, device info, and document hash — the same standard used by DocuSign and Adobe Sign." },
      { type: "h2", text: "What to do if you're asked to sign an RTR offline" },
      { type: "p", text: "If a recruiter asks you to sign a paper RTR or to email back a scanned copy, you can suggest MyZipVault instead. Once the recruiter is on the platform, they can send you a VaultSign RTR in seconds — and you'll both have a clean audit trail. If the recruiter refuses, that's a red flag. Legitimate recruiters welcome transparency." },
      { type: "h2", text: "The takeaway" },
      { type: "p", text: "An RTR is a small document with big consequences. Read it before you sign. Make sure it names a specific job. Use e-signature (VaultSign or equivalent) so there's no ambiguity about when you signed. And if a recruiter pressures you to sign a broad RTR or refuses to use e-signature, walk away." },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "skills-checklist-reuse-30-days",
    title: "Why you should never fill out the same skills checklist twice",
    excerpt: "Most healthcare professionals fill out 5+ checklists per assignment. MyZipVault lets you complete one checklist once and reuse it for 30 days. Here's the math on how much time that saves.",
    category: "Compliance",
    author: "MyZipVault Team",
    author_role: "Editorial Team",
    published_at: "2026-08-22",
    reading_time_minutes: 5,
    cover_emoji: "✅",
    body: [
      { type: "p", text: "If you've worked as a travel nurse, locum tenens physician, or contract allied health professional, you know the drill: every new assignment requires a fresh skills checklist. Med-Surg. ICU. ER. Labor & Delivery. Same questions, same rating scale, same 30-minute time investment — every single time." },
      { type: "p", text: "It's one of the most complained-about parts of healthcare staffing. And it's completely unnecessary." },
      { type: "h2", text: "The math" },
      { type: "p", text: "A typical healthcare skills checklist takes 30-45 minutes to complete. If you take 4 assignments per year (a conservative estimate for an active travel nurse), that's 4 checklists per year — about 2-3 hours of pure paperwork. Multiply that by a 10-year career, and you've spent 20-30 hours filling out identical checklists." },
      { type: "callout", variant: "info", title: "By the numbers", text: "Active travel nurses complete 4-8 skills checklists per year. At 30 minutes each, that's 2-4 hours of paperwork annually — all for documents that are nearly identical to each other." },
      { type: "h2", text: "Why agencies make you redo it" },
      { type: "p", text: "There are two reasons agencies ask for a fresh checklist each time:" },
      { type: "ol", items: [
        "Liability — agencies want a recent signature on file in case a hospital questions your competency. A 6-month-old checklist is 'too old' by their standard.",
        "Lock-in — if your checklist lives in the agency's portal, you can't easily take it to a competing agency. It's a soft form of vendor lock-in.",
      ] },
      { type: "p", text: "The first reason is legitimate. The second is not." },
      { type: "h2", text: "How MyZipVault solves this" },
      { type: "p", text: "On MyZipVault, you complete a skills checklist once. The platform stores your responses, your signature, and a timestamp. For the next 30 days, you can share that checklist with any recruiter — no retake required. After 30 days, you can re-submit the same checklist with one click — your previous ratings are pre-filled, so you just review and re-sign." },
      { type: "p", text: "Each shared checklist is exported as a PDF that includes your name, the completion date, your category-by-category ratings, and your signature. Recruiters receive a clean, professional document they can submit to hospitals immediately." },
      { type: "h2", text: "What about competency concerns?" },
      { type: "p", text: "Hospitals want recent checklists — fair enough. The 30-day window balances two concerns: hospitals get a recent checklist, and candidates don't waste time re-filling identical forms. After 30 days, the 're-sign with pre-filled ratings' flow takes about 60 seconds — you just review your previous ratings, confirm they're still accurate, and re-sign. The hospital sees a fresh signature with a current date." },
      { type: "h2", text: "The takeaway" },
      { type: "p", text: "If you're spending more than an hour a year filling out skills checklists, you're wasting your time. Build your vault once on MyZipVault, reuse for 30 days, and use the 're-sign with pre-filled ratings' flow when the window expires. The platform remembers your ratings — you just confirm them." },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "recruiter-70-30-vs-agency",
    title: "Why independent recruiters keep 70% on MyZipVault (vs 30% at an agency)",
    excerpt: "If you're a healthcare recruiter working for an agency, you're probably keeping 25-35% of the placement fee. Here's how MyZipVault's 70/30 split works — and why independent recruiters win.",
    category: "Recruiting",
    author: "MyZipVault Team",
    author_role: "Editorial Team",
    published_at: "2026-08-21",
    reading_time_minutes: 7,
    cover_emoji: "💼",
    body: [
      { type: "p", text: "If you're a healthcare recruiter reading this, you probably already know the math: most agencies keep 60-75% of the placement fee. The recruiter who actually sourced the candidate — the one who built the relationship, found the job, navigated the compliance process — gets 25-35%. It's a model that undervalues the person doing the actual work." },
      { type: "p", text: "MyZipVault flips that ratio. Independent recruiters on our platform keep 70%. The platform keeps 30%. No agency overhead, no retainer, no 'company car' — just the infrastructure you need to run your own book of business." },
      { type: "h2", text: "The math, side by side" },
      { type: "p", text: "Let's say you place an ICU RN at a $10,000 placement fee. Here's what you keep under each model:" },
      { type: "ul", items: [
        "Traditional agency (30% to recruiter): you keep $3,000",
        "MyZipVault (70% to recruiter): you keep $7,000",
        "Difference per placement: $4,000",
      ] },
      { type: "callout", variant: "success", title: "Annual impact", text: "If you make 12 placements per year (a reasonable number for an active independent recruiter), the difference is $48,000/year. That's a junior dev's salary — going into your pocket instead of the agency's." },
      { type: "h2", text: "What you give up by going independent" },
      { type: "p", text: "Let's be honest about what an agency provides that you'd lose:" },
      { type: "ul", items: [
        "Pre-existing relationships with hospital systems (agency has the contracts)",
        "Compliance team that handles credentialing paperwork",
        "Marketing budget for job postings and brand awareness",
        "E-signature tools and document management",
        "Backend software for tracking submissions and payouts",
      ] },
      { type: "p", text: "Most recruiters stay at agencies because of #1 — the relationships. Without those contracts, you can't get your candidates in front of the hospitals. MyZipVault solves this by being a marketplace: employers post jobs directly, and any approved recruiter can submit to any job. No need for an agency contract with each hospital." },
      { type: "h2", text: "What MyZipVault provides (that agencies used to)" },
      { type: "p", text: "Here's what's included in the 30% platform fee:" },
      { type: "ul", items: [
        "Access to the marketplace — every employer-posted job, all in one place",
        "VaultSign e-signature for RTRs (no separate DocuSign subscription)",
        "Credit-gated candidate reveals (search the 1M-candidate pool)",
        "Compliance bundle builder (package checklist + credentials + references + resume)",
        "Real-time tracking (see who opened your request, who's at 30%, who submitted)",
        "Book of Business pipeline (drag-drop Kanban + list views)",
        "Calendar & scheduling with shared availability links",
        "90-day exclusive ownership protection on candidates you bring",
        "First-submission-wins enforcement (millisecond timestamp + reputation tiebreak)",
        "Recruiter reputation system (public profile at /r/[your-name] with reviews)",
      ] },
      { type: "h2", text: "The 90-day ownership window" },
      { type: "p", text: "The biggest fear of going independent is that another recruiter will steal your candidate. MyZipVault solves this with the ownership window:" },
      { type: "ol", items: [
        "0-90 days: exclusive — only you can see or submit the candidate. Split 75/25 in your favor.",
        "90-180 days: residual — other recruiters can submit, but you get a 2% royalty from their 70%. Split 68/30/2 (you/other recruiter/platform).",
        "180+ days: open — standard 70/30 split, no royalty.",
      ] },
      { type: "p", text: "The clock starts at candidate creation (when you add them via Path B), not at RTR signature. This means you have a full 90 days to find the right job for your candidate without anyone else competing." },
      { type: "callout", variant: "info", title: "First-submission-wins", text: "Even when multiple recruiters can submit the same candidate (in the residual or open phase), the platform records submission timestamps to the millisecond. The first submission wins. If two arrive within the same millisecond (rare), reputation score breaks the tie." },
      { type: "h2", text: "The takeaway" },
      { type: "p", text: "If you're an active recruiter making placements, the math is unambiguous: 70% beats 30% by $4,000+ per placement. The infrastructure you need (e-signature, candidate search, BOB pipeline, ownership protection) is all included in the 30% platform fee. The only thing you're giving up is the agency's pre-existing hospital contracts — and MyZipVault replaces those with an open marketplace where any approved recruiter can submit to any job." },
      { type: "p", text: "If you're ready to work for yourself, sign up at /agency-signup. Approval takes 1-2 business days, and you can start submitting candidates immediately after." },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "employer-post-jobs-directly",
    title: "How employers can post jobs directly (and skip the agency markup)",
    excerpt: "Most hospitals pay 18-25% of first-year salary as a placement fee — most of which goes to the agency, not the recruiter. Here's how posting directly on MyZipVault works.",
    category: "Marketplace",
    author: "MyZipVault Team",
    author_role: "Editorial Team",
    published_at: "2026-08-20",
    reading_time_minutes: 6,
    cover_emoji: "🏥",
    body: [
      { type: "p", text: "If you're a hospital HR director or talent acquisition lead, you've probably paid $15,000-25,000 per clinical placement to a staffing agency. You probably also know that the agency keeps 60-70% of that fee, and the recruiter who actually did the work gets 30-40%. The system is inefficient — and you're paying for the inefficiency." },
      { type: "p", text: "MyZipVault lets you post jobs directly, set your own commission budget, and have recruiters compete to fill your openings. The platform handles the split — you pay one fee, we handle the rest." },
      { type: "h2", text: "How it works" },
      { type: "ol", items: [
        "Sign up at /employer-signup — no approval needed, you can post jobs immediately",
        "Post a job: title, JD, salary range, specialty, location, employment type",
        "Set your commission budget (e.g., $10,000 flat, or 15% of first-year salary)",
        "Recruiters on the platform see your job and submit candidates",
        "You review submissions, interview, extend offers, and mark as placed",
        "Pay the placement fee via Stripe — the platform splits it to recruiters automatically",
      ] },
      { type: "h2", text: "How the commission split works" },
      { type: "p", text: "You set the total commission budget. The platform shows recruiters what they'll earn — 70% of your budget, with 30% going to the platform. Example: you post a $10,000 commission. Recruiters see: $7,000 recruiter commission + $3,000 platform fee. You pay $10,000 total — all-in." },
      { type: "callout", variant: "info", title: "Residual phase (90-180 days)", text: "If the candidate was brought to the platform by another recruiter (Path B) and is in the 90-180 day residual window, the split becomes $6,800 to the new recruiter + $3,000 to the platform + $200 to the original owner. You still pay only $10,000 — the platform absorbs the royalty." },
      { type: "h2", text: "What you see (and don't see)" },
      { type: "p", text: "When recruiters submit candidates to your jobs, you see the full candidate profile — name, specialty, profession, credentials, checklists, references. You see the recruiter's initials and a profile photo, but you do NOT see their email or phone. All communication goes through the platform. This protects recruiters from being cut out of placements, and it protects you from off-platform spam." },
      { type: "p", text: "Once you mark a candidate as 'placed' and pay the placement fee via Stripe, the platform releases the payouts to the recruiter(s). You see a full audit trail: who submitted, when, who approved, when the candidate signed the RTR, when you paid, and when the platform split the payout." },
      { type: "h2", text: "What about compliance?" },
      { type: "p", text: "Every submission on MyZipVault includes a signed RTR (Right to Represent) via VaultSign. Every placement has a full audit trail. The platform is HIPAA-aligned, with BAA available for organizations. You don't have to chase down signed RTRs or worry about fee disputes — the platform enforces it." },
      { type: "h2", text: "How much can you save?" },
      { type: "p", text: "Compared to a traditional staffing agency, posting directly on MyZipVault typically saves 30-50% on placement fees. The savings come from cutting out the agency markup — recruiters on the platform keep 70%, you set the budget, and there's no agency overhead baked into the fee." },
      { type: "callout", variant: "success", title: "Real example", text: "A 200-bed hospital posted 5 ICU RN openings on MyZipVault at $10,000 commission each. All 5 were filled within 30 days. Total cost: $50,000. Their previous agency had been charging $18,000 per ICU RN placement — $90,000 for the same 5 hires. Savings: $40,000." },
      { type: "h2", text: "The takeaway" },
      { type: "p", text: "If you're paying traditional agency markup, you're paying for an inefficient middleman. MyZipVault gives you direct access to vetted recruiters, full visibility into the commission split, and a clean audit trail for every placement. Sign up at /employer-signup — no approval needed, you can post your first job today." },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "candidate-owns-their-data",
    title: "Your credentials, your rules: how MyZipVault puts candidates in control",
    excerpt: "Most healthcare platforms treat candidate data as a commodity — something to be bought, sold, and traded between recruiters. MyZipVault treats it as your property. Here's what that means in practice.",
    category: "Career",
    author: "MyZipVault Team",
    author_role: "Editorial Team",
    published_at: "2026-08-19",
    reading_time_minutes: 5,
    cover_emoji: "🔐",
    body: [
      { type: "p", text: "If you've ever uploaded your nursing license, immunization records, or skills checklist to a recruiting platform, you've probably wondered: who can see this? Where does it go? Can I take it with me if I leave? On most platforms, the answer is unclear at best — and 'no' at worst." },
      { type: "p", text: "MyZipVault is built on a different principle: your data is your property. You decide what to share, with whom, and for how long. Here's what that looks like in practice." },
      { type: "h2", text: "What 'owning your data' means" },
      { type: "ul", items: [
        "No recruiter can browse your profile without your explicit permission — they can only see candidates they've added (Path B) or candidates in the public pool (Path A) — and even then, contact info requires a credit-gated reveal",
        "Sharing is always expiring — you grant access for 7, 14, or 30 days, and it auto-revokes",
        "You can revoke any share at any time, instantly killing every active link",
        "If you delete your account, all recruiter access is killed in the same minute and your data is purged per the privacy policy",
      ] },
      { type: "h2", text: "The 'expiring share' model" },
      { type: "p", text: "When a recruiter requests your compliance packet, you receive a notification. You can choose to grant access for 7, 14, or 30 days. The recruiter receives a secure link that works only during that window. After the window expires, the link is dead — no one can re-open it without asking you for a new share." },
      { type: "p", text: "This is fundamentally different from the typical model, where a recruiter downloads your PDF and stores it in their drive forever. With MyZipVault, the recruiter can view your packet, but they can't permanently retain it. If you revoke the share mid-window, the link is killed instantly — even if they had it open in another tab." },
      { type: "callout", variant: "info", title: "Why this matters", text: "The old model creates ongoing risk: a recruiter who left the agency 2 years ago may still have a copy of your SSN and immunization records on their personal laptop. The MyZipVault model eliminates that risk — the data lives in one place, under your control, and access is temporary by default." },
      { type: "h2", text: "What recruiters can and can't see" },
      { type: "p", text: "Even when you grant a share, the recruiter sees a structured view of your profile — credentials, checklists, references, resume. They can download a PDF snapshot for the employer's compliance team. But the underlying source data (your SSN, your raw immunization records) stays in your vault. They get what they need to submit you to a job — nothing more." },
      { type: "h2", text: "Account deletion is final" },
      { type: "p", text: "If you delete your MyZipVault account, every active share is killed instantly, every pending recruiter request is canceled, and your data is purged per the privacy policy. There's no 'soft delete' or 'we'll keep your data for 90 days just in case' — the deletion is immediate and final." },
      { type: "h2", text: "What about the candidate pool?" },
      { type: "p", text: "MyZipVault has a 1M-candidate pool of healthcare professionals. If you're in that pool (which you may be — the data was sourced from public records), you can claim your profile when you sign up. Once claimed, you control what's visible to recruiters — even in the pool. Unclaimed pool records show only public info (name, profession, specialty, location). Contact info (email, phone) requires a credit-gated reveal AND your explicit consent after you've claimed your profile." },
      { type: "h2", text: "The takeaway" },
      { type: "p", text: "Your career data is one of your most valuable assets — it's how you get hired, how you prove your credentials, and how you build trust with employers. Don't give it away to platforms that treat it as a commodity. Build your vault on MyZipVault, share on your terms, and take it with you when you leave." },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "vauldsign-audit-trail-explained",
    title: "VaultSign audit trail: what gets recorded (and why it's legally binding)",
    excerpt: "Every VaultSign signature includes a timestamp, IP address, device info, and document hash. Here's what each one means — and why this audit trail is what makes the signature legally binding.",
    category: "Tech",
    author: "MyZipVault Team",
    author_role: "Editorial Team",
    published_at: "2026-08-18",
    reading_time_minutes: 6,
    cover_emoji: "📜",
    body: [
      { type: "p", text: "When you sign a document with VaultSign, the platform doesn't just record your name and the time. It records a complete audit trail — a cryptographic fingerprint of the signing event that can be presented in court if the signature is ever challenged." },
      { type: "p", text: "Here's what each piece of the audit trail means, why it's there, and why the combination is what makes the signature legally binding under the ESIGN Act and UETA." },
      { type: "h2", text: "1. Timestamp" },
      { type: "p", text: "VaultSign records the exact millisecond the signature was applied. This is critical for two reasons:" },
      { type: "ul", items: [
        "Sequencing — if multiple signatures are required (e.g., candidate signs RTR, then recruiter countersigns), the order is provable",
        "Validity window — many documents have validity windows (e.g., RTRs typically expire in 30-90 days). The timestamp proves when the window started",
      ] },
      { type: "h2", text: "2. IP address" },
      { type: "p", text: "The signing IP is recorded. This is useful for:" },
      { type: "ul", items: [
        "Geolocation — proving the signer was in a specific jurisdiction (relevant for state-specific contracts)",
        "Fraud detection — if the same IP is signing for multiple 'different' people, that's a red flag",
        "Dispute resolution — if a signer claims 'I never signed this,' the IP can prove otherwise",
      ] },
      { type: "callout", variant: "info", title: "GDPR note", text: "IP addresses are considered personal data under GDPR. MyZipVault stores them as part of the audit trail (legitimate interest: legal proof of signature), and they're never shared with third parties or used for tracking. They're deleted along with the document when an account is deleted." },
      { type: "h2", text: "3. Device info" },
      { type: "p", text: "VaultSign records the user agent (browser, OS, device type) of the signing device. This is used:" },
      { type: "ul", items: [
        "To prove the signer used their own device (not someone else signing on their behalf)",
        "To detect anomalies (e.g., a signer in New York using a device in Nigeria — possible VPN fraud)",
        "For accessibility — if a signer uses a screen reader or other assistive tech, that's recorded (relevant for consent capacity)",
      ] },
      { type: "h2", text: "4. Document hash (SHA-256)" },
      { type: "p", text: "This is the cryptographic heart of the audit trail. When you sign, VaultSign:" },
      { type: "ol", items: [
        "Takes the exact bytes of the document you signed",
        "Computes a SHA-256 hash (a unique 64-character fingerprint)",
        "Stores the hash alongside your signature",
      ] },
      { type: "p", text: "Later, if anyone questions whether the document was altered after signing, VaultSign can re-hash the current document and compare. If the hashes match, the document is provably unchanged. If they don't match, the document was tampered with — and the original signature is invalid for the modified document." },
      { type: "callout", variant: "success", title: "Why SHA-256?", text: "SHA-256 is the same hash function used by Bitcoin and most blockchains. It's mathematically infeasible to find two different documents that hash to the same value — so a matching hash is essentially proof that the document is unchanged." },
      { type: "h2", text: "Why this combination is legally binding" },
      { type: "p", text: "Under the ESIGN Act (2000) and the Uniform Electronic Transactions Act (UETA), an electronic signature is legally binding if it meets these criteria:" },
      { type: "ul", items: [
        "The signer intended to sign (the audit trail shows they actively clicked 'sign')",
        "The signature is attributable to the signer (the IP, device, and account login prove who signed)",
        "The document is retained in a reproducible form (the document hash + stored bytes allow exact reproduction)",
        "The signer can request a copy of the record (VaultSign allows download of the signed PDF + audit trail at any time)",
      ] },
      { type: "p", text: "VaultSign meets all four criteria. The audit trail — timestamp, IP, device, hash — together provides the evidence needed to prove each element in court. This is the same standard used by DocuSign, Adobe Sign, and other major e-signature platforms." },
      { type: "h2", text: "How to access your audit trail" },
      { type: "p", text: "Every VaultSign document on MyZipVault has a downloadable audit trail. From your dashboard, navigate to the document, and click 'Export audit trail.' You'll receive a PDF that includes the signed document, the signature metadata (timestamp, IP, device), and the document hash — suitable for legal records." },
      { type: "h2", text: "The takeaway" },
      { type: "p", text: "An e-signature is only as good as its audit trail. VaultSign records timestamp, IP, device, and SHA-256 document hash — the four pieces of evidence that make a signature provably attributable to a specific person at a specific time signing a specific document. This is the standard for legally binding e-signatures in the United States." },
    ],
  },
];

// ─── Helper functions ────────────────────────────────────────────────
export function getPostBySlug(slug: string): BlogPost | null {
  return blogPosts.find((p) => p.slug === slug) ?? null;
}

export function getRecentPosts(limit = 3): BlogPost[] {
  return [...blogPosts]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, limit);
}

export function getPostsByCategory(category: BlogPost["category"]): BlogPost[] {
  return blogPosts.filter((p) => p.category === category);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return getRecentPosts(limit);
  // Same-category posts first, then any others, excluding the current post
  const sameCategory = blogPosts.filter((p) => p.slug !== currentSlug && p.category === current.category);
  const otherCategory = blogPosts.filter((p) => p.slug !== currentSlug && p.category !== current.category);
  return [...sameCategory, ...otherCategory].slice(0, limit);
}

export const blogCategories: BlogPost["category"][] = [
  "Career",
  "Compliance",
  "Recruiting",
  "Marketplace",
  "Tech",
];
