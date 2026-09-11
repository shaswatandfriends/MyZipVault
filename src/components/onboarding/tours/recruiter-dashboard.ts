import type { TourStep } from "@/components/onboarding/tour";

/**
 * Recruiter Dashboard Onboarding Tour — 12 steps.
 *
 * Auto-starts on first recruiter dashboard load if
 * User.onboarding_tour_completed_at is null. Can be re-triggered via
 * "Take a tour" button in sidebar.
 *
 * Targets use CSS selectors that match the live sidebar items rendered by
 * src/components/layout/sidebar.tsx.
 *
 * Phase 6.3 of EXECUTION-PLAN.
 */
export const RECRUITER_DASHBOARD_TOUR: TourStep[] = [
  {
    target: "[data-tour='stats']",
    title: "Pipeline at a glance",
    description: "Track your active jobs, total candidates, submittals, and placements in real time.",
  },
  {
    target: "a[href='/recruiter/dashboard']",
    title: "Recruiter Dashboard",
    description: "Your home base — pending requests, recent submissions, and pipeline metrics.",
  },
  {
    target: "a[href='/recruiter/send']",
    title: "Send Request",
    description: "Send a checklist + document request to a candidate. Specialty is now a free-text field — type any specialty.",
  },
  {
    target: "a[href='/recruiter/invite']",
    title: "Invite Candidate",
    description: "NEW: Reach out to a candidate about a specific job. Fixed email template, auto-loads job description by Job ID, 72-hr cooldown per candidate.",
  },
  {
    target: "a[href='/recruiter/candidates/search']",
    title: "Find Candidates",
    description: "Browse the 1M+ healthcare candidate pool. Reveal contact info costs 2 credits per field; unlock the full packet is 3 credits.",
  },
  {
    target: "a[href='/recruiter/candidates']",
    title: "My BOB",
    description: "Track leads through your pipeline. Hot/warm/cold tags, 12 stages, call scheduling, activity timeline.",
  },
  {
    target: "a[href='/recruiter/jobs']",
    title: "Open Jobs",
    description: "Browse open positions. Bonus jobs (⚡) pay extra — prioritize them. Click any job to submit a candidate.",
  },
  {
    target: "a[href='/recruiter/vaultsign']",
    title: "VaultSign",
    description: "Send RTRs, offer letters, NDAs for electronic signature. 8 document types, multi-party signing, SHA-256 tamper detection.",
  },
  {
    target: "a[href='/recruiter/billing']",
    title: "Billing",
    description: "Buy credits (default $2 each) and download Stripe invoices. Credits are org-scoped — your whole team shares the balance.",
  },
  {
    target: "a[href='/recruiter/baa']",
    title: "BAA",
    description: "Sign your Business Associate Agreement (HIPAA compliance). Required before you can access candidate PHI.",
  },
  {
    target: "a[href='/recruiter/team']",
    title: "Team",
    description: "Invite colleagues to your organization. Admins can manage users + billing; recruiters can submit candidates.",
  },
  {
    target: "a[href='/recruiter/settings']",
    title: "Org Settings",
    description: "Manage your organization profile, branding, BAA status. You're all set — click Finish to start recruiting!",
  },
];
