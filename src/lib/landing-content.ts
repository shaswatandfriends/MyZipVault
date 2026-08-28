/**
 * Shared content for the MyZipVault marketing site.
 *
 * Used by:
 *   - src/app/page.tsx (landing page)
 *   - src/app/for-candidates/page.tsx
 *   - src/app/for-recruiters/page.tsx
 *   - src/app/for-employers/page.tsx
 *   - src/app/marketplace-flow/page.tsx
 *   - src/app/credit-system/page.tsx
 *   - src/app/faq/page.tsx
 *
 * Single source of truth — edit content here and it propagates everywhere.
 */

import type { LucideIcon } from "@/lib/icons";
import {
  Briefcase, Users, HelpCircle, FileSignature, CreditCard, Mail,
  Search, Database, Send, Lock, Star, CheckCircle2, Clock, Bell,
  Stethoscope, Calendar, TrendingUp, Award, Zap, Eye, FolderOpen,
  BadgeCheck, Handshake, Sparkles, Phone, UserPlus, DollarSign,
  FileText,
} from "@/lib/icons";

// ─── Hamburger Menu ─────────────────────────────────────────────────────
export interface MenuLink {
  icon: LucideIcon;
  label: string;
  href: string;
  /** When true, opens in a new tab (external links) */
  external?: boolean;
}

export interface MenuSection {
  title: string;
  items: MenuLink[];
}

export const menuSections: MenuSection[] = [
  {
    title: "ABOUT",
    items: [
      { icon: Briefcase, label: "What is MyZipVault?", href: "/about" },
      { icon: Users, label: "Our Story", href: "/our-story" },
      { icon: FileText, label: "Blog", href: "/blog" },
      { icon: Mail, label: "Contact", href: "/contact" },
      { icon: Handshake, label: "Referral Program", href: "/referral-program" },
    ],
  },
  {
    title: "HOW IT WORKS",
    items: [
      { icon: Briefcase, label: "Browse Jobs", href: "/browse-jobs" },
      { icon: Briefcase, label: "For Candidates", href: "/for-candidates" },
      { icon: Search, label: "For Recruiters", href: "/for-recruiters" },
      { icon: Briefcase, label: "For Employers", href: "/for-employers" },
      { icon: Send, label: "Marketplace Flow", href: "/marketplace-flow" },
      { icon: CreditCard, label: "Credit System", href: "/credit-system" },
    ],
  },
  {
    title: "HELP",
    items: [
      { icon: HelpCircle, label: "FAQ", href: "/faq" },
      { icon: Phone, label: "Support", href: "/support" },
      { icon: Lock, label: "Privacy Policy", href: "/privacy" },
      { icon: FileSignature, label: "Terms of Service", href: "/terms" },
    ],
  },
];

// ─── Candidate Features ────────────────────────────────────────────────
export const candidateFeatures = [
  { icon: Briefcase, title: "Browse & Apply to Jobs", desc: "Indeed-style job board. See salary, specialty, location. Apply directly — no recruiter needed. 100% free." },
  { icon: Sparkles, title: "AI Resume Builder (Tedo)", desc: "Conversational AI assistant builds your resume. ATS scoring, optimization, PDF export. 3 versions." },
  { icon: CheckCircle2, title: "Skills Checklists", desc: "Complete industry-standard checklists once. Reuse for 30 days. No retakes. PDF export with your name." },
  { icon: Lock, title: "Credential Vault", desc: "Upload BLS, ACLS, RN License, immunizations. Admin-verified. Expiry reminders 30 days before renewal." },
  { icon: Users, title: "Reference Network", desc: "Connect with managers. They verify and sign references via VaultSign. Stored permanently — ready to share." },
  { icon: FileSignature, title: "VaultSign E-Signature", desc: "Sign RTR documents, offer letters, and more. Full audit trail. No more printing + scanning." },
  { icon: Calendar, title: "Calendar & Scheduling", desc: "Set availability. Receive shift requests. Share calendar links with recruiters. Daily call sheets." },
  { icon: Lock, title: "Sharing Controls", desc: "Grant expiring access (7/14/30 days). Revoke anytime. Recruiters see ONLY what you allow. Nothing more." },
  { icon: Database, title: "Profile Auto-Link", desc: "If your email matches our healthcare pool, your profile is auto-filled — specialty, location, etc." },
  { icon: Star, title: "Rate Recruiters", desc: "Leave 5-dimensional reviews. Public on profiles. Dispute mechanism for unfair reviews." },
  { icon: Lock, title: "Report Recruiters", desc: "File formal complaints for misrepresentation, harassment, RTR violations. Auto-suspension on upheld reports." },
  { icon: Bell, title: "Smart Notifications", desc: "Real-time alerts for job matches, checklist requests, document views, credential expiry warnings." },
];

// ─── Recruiter Features ────────────────────────────────────────────────
export const recruiterFeatures = [
  { icon: Briefcase, title: "Browse Open Jobs", desc: "See all open positions with commission info. Pick the jobs worth your time." },
  { icon: Search, title: "Search Candidate Pool", desc: "Search by name, email, phone, specialty, location. Path A — use platform data." },
  { icon: Users, title: "Bring Your Own", desc: "Path B — add candidates from your network. 90-day exclusive ownership if both email + phone are new." },
  { icon: FileSignature, title: "Send RTR via VaultSign", desc: "Send Right to Represent. Candidate e-signs. No RTR = no submission. Full consent layer." },
  { icon: CreditCard, title: "Credit-Gated Reveal", desc: "Pay credits to unlock email + phone. 90-day reveal validity. Costs configurable." },
  { icon: Send, title: "Submit Candidates", desc: "First-submission-wins (millisecond timestamp + reputation tiebreak). One candidate → one job = one recruiter." },
  { icon: Lock, title: "Ownership Windows", desc: "0-90 days: exclusive (75/25). 90-180: residual (68/30/2). 180+: open (70/30)." },
  { icon: FolderOpen, title: "Book of Business", desc: "Drag-drop pipeline. Kanban + list views. Candidate pools. Lead tracking. Pipeline reports." },
  { icon: Calendar, title: "Calendar & Scheduling", desc: "Availability scheduling. Shift requests. Daily call sheets. Auto-match candidates to shifts." },
  { icon: BadgeCheck, title: "Compliance Bundles", desc: "Pre-package checklist + credentials + references + resume. One request gets everything." },
  { icon: Eye, title: "Real-Time Tracking", desc: "See who opened your request, who's at 30% or 90%, who submitted. No more guessing." },
  { icon: Star, title: "Recruiter Reputation", desc: "Public profile at /r/[your-name]. Reviews from candidates. Verified badges." },
  { icon: CreditCard, title: "Credit Purchase", desc: "Buy credits via Stripe. Platform admin can also allocate credits." },
  { icon: Bell, title: "Smart Notifications", desc: "Real-time alerts for submission status changes, new job postings, candidate responses." },
];

// ─── Employer Features ────────────────────────────────────────────────
export const employerFeatures = [
  { icon: Briefcase, title: "Post Jobs Directly", desc: "Create job postings with title, JD, salary, and commission. Set your budget — platform handles the split." },
  { icon: DollarSign, title: "Set Your Commission", desc: "Post $10,000 commission. Platform shows recruiters $7,000 (70%) + $3,000 platform fee. You see the total." },
  { icon: Search, title: "Browse Candidates", desc: "Search the healthcare candidate pool. Buy credits to reveal contact info. Same as recruiters." },
  { icon: Send, title: "Review Submissions", desc: "See candidates submitted to your jobs by recruiters. View profiles, credentials, checklists." },
  { icon: Eye, title: "Anonymized Recruiter View", desc: "See recruiter initials (e.g., 'SP') and photo only. No email or phone. All communication through platform." },
  { icon: CheckCircle2, title: "Manage Pipeline", desc: "Update submission status: reviewing → interview → offer → placed. Platform calculates payouts automatically." },
  { icon: Briefcase, title: "Your Company Profile", desc: "Your organization is linked to every job. Candidates see your company name on job postings." },
  { icon: TrendingUp, title: "Analytics Dashboard", desc: "Track job views, applications, submissions, placements, and total spend in one view." },
  { icon: CreditCard, title: "Credit System", desc: "Buy credits to reveal candidate contact info. Same credit costs as recruiters. Manage via Stripe." },
  { icon: Lock, title: "Platform-Mediated Payment", desc: "You pay the platform. Platform splits to recruiters (70/30 or per ownership window). No direct payments." },
  { icon: Lock, title: "Compliance Built-In", desc: "Every submission has a signed RTR. Every placement has an audit trail. HIPAA-aligned." },
  { icon: Bell, title: "Smart Notifications", desc: "Real-time alerts for new submissions, status changes, candidate responses, and placement confirmations." },
];

// ─── Marketplace Flow ─────────────────────────────────────────────────
export const flowSteps = [
  { icon: Briefcase, title: "Post a Job", desc: "Employer or platform posts a job with commission. Set public for candidate self-apply or private for recruiters." },
  { icon: Search, title: "Find Candidates", desc: "Recruiters search the pool (Path A) or bring their own (Path B with 90-day exclusive ownership)." },
  { icon: FileSignature, title: "Send RTR", desc: "Recruiter sends Right to Represent via VaultSign. Candidate e-signs. No RTR, no submission." },
  { icon: Send, title: "Submit & Win", desc: "First submission wins (millisecond timestamp). 90-day exclusive (75/25), then residual (68/30/2)." },
];

// ─── Ownership Windows ─────────────────────────────────────────────────
export const ownershipWindows = [
  {
    title: "0–90 days: Exclusive",
    split: "75 / 25",
    accent: "exclusive",
    description: "When a recruiter brings a new candidate (Path B — both email and phone are new to the platform), they get 90 days of exclusive access. No other recruiter can see or submit that candidate. The split is 75% to the originating recruiter and 25% to the platform.",
  },
  {
    title: "90–180 days: Residual",
    split: "68 / 30 / 2",
    accent: "residual",
    description: "After the 90-day exclusive window, the candidate enters the residual phase. Other recruiters can now submit the candidate, but the original owner receives a 2% royalty from the new recruiter's 70% share. Split: 68% to the new recruiter, 30% to the platform, 2% to the original owner.",
  },
  {
    title: "180+ days: Open",
    split: "70 / 30",
    accent: "open",
    description: "After 180 days, the candidate is fully open. Any recruiter can submit, with the standard 70/30 split between the recruiter and the platform. No residual royalty is paid to the original owner.",
  },
];

// ─── Verification Items ────────────────────────────────────────────────
export const verificationItems = [
  {
    icon: CheckCircle2,
    title: "Skills Checklists",
    desc: "Industry-standard healthcare checklists. Complete once, reuse for 30 days.",
    features: ["Complete once, share for 30 days", "Industry-standard templates", "PDF export with your name", "Reminders before expiry"],
  },
  {
    icon: Lock,
    title: "Credential Management",
    desc: "Upload BLS, ACLS, RN License, immunizations. Admin verification + expiry reminders.",
    features: ["Admin-verified credentials", "Automatic expiry reminders", "Secure storage with audit trail", "One-click share with recruiters"],
  },
  {
    icon: FileSignature,
    title: "VaultSign E-Signature",
    desc: "Full e-signature platform: templates, multi-signer, audit trails, PDF export.",
    features: ["Multi-signer sequential/parallel", "Full audit trail with IP + device", "PDF export with signature data", "Auto-expiry + reminders"],
  },
];

// ─── Comparison Table ──────────────────────────────────────────────────
export const comparisonRows = [
  { feature: "Cost to candidate", mzv: "100% Free", agency: "Free", linkedin: "Free" },
  { feature: "Candidate data ownership", mzv: "Candidate owns everything", agency: "Agency owns the data", linkedin: "LinkedIn owns the data" },
  { feature: "Checklist reuse", mzv: "Complete once, reuse 30 days", agency: "Retake every time", linkedin: "No checklists" },
  { feature: "Reference portability", mzv: "Verified references follow candidate", agency: "References stay with agency", linkedin: "No reference system" },
  { feature: "Document signing", mzv: "VaultSign e-signature built-in", agency: "Print, sign, scan, email", linkedin: "No signing" },
  { feature: "Independent operation", mzv: "Recruiters work for themselves", agency: "Recruiters work for agency", linkedin: "Recruiters need company account" },
  { feature: "Placement protection", mzv: "90-day ownership + circumvention detection", agency: "Varies by contract", linkedin: "None" },
  { feature: "Employer job posting", mzv: "Employers post directly with commission", agency: "Agency posts on behalf", linkedin: "Employers post (expensive)" },
];

// ─── FAQ ──────────────────────────────────────────────────────────────
export interface FaqItem { q: string; a: string }
export interface FaqSection { category: string; items: FaqItem[] }

export const faqSections: FaqSection[] = [
  {
    category: "General",
    items: [
      { q: "What is MyZipVault?", a: "A healthcare recruiting marketplace where candidates own their data, recruiters work independently (not for a company), employers post jobs directly, and every placement is monitored and protected." },
      { q: "Is this free?", a: "100% free for candidates. Recruiters pay nothing upfront — 70/30 split on placements. Employers set their own commission budget." },
      { q: "Do recruiters need to work for a company?", a: "No. Recruiters work independently. They keep 70% of placement fees. No agency overhead, no retainer." },
      { q: "Can employers post jobs directly?", a: "Yes. Employers sign up, post jobs with their own commission budget, and receive submissions from recruiters. They set the fee — platform handles the split." },
    ],
  },
  {
    category: "For Employers",
    items: [
      { q: "How does the employer commission work?", a: "Employer posts a job with a commission (e.g., $10,000). Platform shows recruiters: $7,000 recruiter commission + $3,000 platform fee. If a candidate was brought by another recruiter (Path B, within residual window), the split is $6,800 + $3,000 + $200 to original owner." },
      { q: "Can employers see recruiter contact info?", a: "No. Employers see recruiter initials (e.g., 'SP') and photo only. All communication goes through the platform. This protects both parties." },
      { q: "Can employers search candidates directly?", a: "Yes. Employers can browse the candidate pool and buy credits to reveal contact info, same as recruiters. This gives employers a direct sourcing option." },
      { q: "How does payment work?", a: "Employer pays the platform. Platform splits the payment to recruiters based on the ownership window: 75/25 during exclusive, 68/30/2 during residual, 70/30 standard. No direct employer-to-recruiter payments." },
    ],
  },
  {
    category: "VaultSign",
    items: [
      { q: "What is VaultSign?", a: "Our built-in e-signature platform. Used for Right to Represent (RTR), offer letters, and any document requiring signature." },
      { q: "Is VaultSign legally binding?", a: "Yes. Each signature includes timestamp, IP address, device info, and document hash (SHA-256). Full audit trail stored permanently." },
      { q: "Can multiple people sign?", a: "Yes. Sequential (one after another) or parallel (all at once) signing orders supported." },
    ],
  },
  {
    category: "Marketplace & Ownership",
    items: [
      { q: "What is the 90-day ownership window?", a: "When a recruiter brings a new candidate (Path B), they get 90 days of exclusive access. No other recruiter can see or submit that candidate. Split: 75/25." },
      { q: "What happens after 90 days?", a: "Days 90-180: 'residual' phase. Other recruiters can submit, but original owner gets 2% from the new recruiter's 70%. Split: 68/30/2." },
      { q: "What if two recruiters submit the same candidate?", a: "First submission wins (millisecond timestamp). If tied, reputation score breaks the tie." },
    ],
  },
  {
    category: "Credits",
    items: [
      { q: "How do credits work?", a: "Recruiters and employers buy credits via Stripe. Credits are spent to reveal contact info, submit candidates, send checklists. Each action's cost is configurable." },
      { q: "Do candidates need credits?", a: "No. Credits are recruiter/employer-side only. Candidates are 100% free." },
      { q: "Can I get a refund on unused credits?", a: "Credits do not expire. Once purchased, they remain on your account until used. Refunds are handled case-by-case via support." },
      { q: "Who sets the credit costs?", a: "The platform admin configures credit costs for each action (reveal, submission, checklist send, etc.) via the Superadmin → Credit Costs settings page." },
    ],
  },
  {
    category: "Checklists",
    items: [
      { q: "How long is a checklist valid?", a: "30 days from completion. After 30 days, you can re-submit the same checklist with one click — no need to re-fill every field." },
      { q: "Who verifies my checklist?", a: "Checklists are self-attested. Recruiters receive a PDF with your name, signature, and timestamp. Reference checks happen via the Reference Network." },
      { q: "Can I export my checklist as a PDF?", a: "Yes. Every completed checklist can be exported as a PDF that includes your name, the completion date, your category-by-category ratings, and your signature." },
    ],
  },
  {
    category: "Privacy & Security",
    items: [
      { q: "Is my data HIPAA compliant?", a: "We are HIPAA-aligned. BAA available for organizations. 256-bit encryption at rest. Full audit trail on every action." },
      { q: "Who owns my data?", a: "You do. If you delete your account, all recruiter access is killed instantly. Your data is purged." },
      { q: "Can recruiters see my profile without my permission?", a: "No. Recruiters can only see candidates they have explicitly added (Path B) or candidates in the public pool (Path A) — and even then, contact info requires a credit-gated reveal. You control everything via Sharing Controls." },
    ],
  },
  {
    category: "Jobs",
    items: [
      { q: "Can candidates apply to jobs directly?", a: "Yes. Employers can mark a job as 'public' for candidate self-apply. Candidates apply without a recruiter and keep 100% of the visibility." },
      { q: "Do candidates pay a fee when placed?", a: "Never. Candidates are 100% free. The placement fee is paid by the employer and split between the recruiter and the platform." },
      { q: "How do I find jobs near me?", a: "Visit the Jobs board from your candidate dashboard. Filter by specialty, location, salary range, and shift type. Save searches for daily alerts." },
    ],
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────
export const testimonials = [
  { name: "Sarah K.", role: "ICU RN, Travel Nurse", text: "I completed my skills checklist once and shared it with three different agencies. No retakes. This saved me hours." },
  { name: "Marcus T.", role: "Healthcare Recruiter, Independent", text: "I work for myself now. 70% of every placement fee goes to me. No agency taking 60%. The 90-day ownership protection is real." },
  { name: "Dr. Patel", role: "Locum Hospitalist", text: "VaultSign eliminated the print-sign-scan cycle. I signed my RTR on my phone in 30 seconds. Full audit trail." },
];

// ─── Stats Bar ────────────────────────────────────────────────────────
export const statsBar = [
  { value: "155+", label: "Checklists" },
  { value: "4", label: "Professions" },
  { value: "100%", label: "Free for Candidates" },
  { value: "70/30", label: "Recruiter Split" },
];

// ─── Credit Actions & Costs (illustrative defaults) ────────────────────
export const creditActions = [
  { action: "Reveal candidate contact info", cost: "10 credits", who: "Recruiters & Employers" },
  { action: "Submit a candidate to a job", cost: "5 credits", who: "Recruiters" },
  { action: "Send a skills checklist request", cost: "2 credits", who: "Recruiters" },
  { action: "Send a reference request", cost: "2 credits", who: "Recruiters" },
  { action: "Send RTR via VaultSign", cost: "3 credits", who: "Recruiters" },
  { action: "Post a job (public)", cost: "0 credits", who: "Employers" },
  { action: "Browse candidate pool", cost: "0 credits", who: "Recruiters & Employers" },
  { action: "Apply to a job", cost: "0 credits", who: "Candidates (always free)" },
];
