import type { TourStep } from "@/components/onboarding/tour";

/**
 * Candidate Dashboard Onboarding Tour — 10 steps.
 * Targets use CSS selectors that match real sidebar items.
 */
export const CANDIDATE_DASHBOARD_TOUR: TourStep[] = [
  {
    target: "a[href='/dashboard']",
    title: "Dashboard",
    description: "Your home base — see pending requests, recent activity, and profile completion at a glance.",
  },
  {
    target: "a[href='/browse-jobs']",
    title: "Browse Jobs",
    description: "Explore open healthcare positions across the marketplace. Apply with one click when your profile is complete.",
  },
  {
    target: "a[href='/checklists']",
    title: "Skills Checklists",
    description: "Complete your profession-specific skills checklist once, share it with any recruiter, forever.",
  },
  {
    target: "a[href='/calendar']",
    title: "Calendar",
    description: "Share your availability with recruiters. Sync interviews and call schedules.",
  },
  {
    target: "a[href='/vaultsign']",
    title: "VaultSign",
    description: "Sign RTRs, offer letters, NDAs, and other documents electronically — legally binding, audit-trail included.",
  },
  {
    target: "a[href='/vault/credentials']",
    title: "Credentials",
    description: "Upload BLS, ACLS, licenses, COVID cards, immunizations. We track expiration dates and notify you before they lapse.",
  },
  {
    target: "a[href='/vault/resume']",
    title: "Resume",
    description: "Upload up to 3 versions of your resume. Pick from 5 superadmin-managed templates. The default version auto-shares with recruiters.",
  },
  {
    target: "a[href='/references']",
    title: "References",
    description: "Request professional references from past employers. They fill out a public-form link — no account needed on their end.",
  },
  {
    target: "a[href='/sharing']",
    title: "Sharing",
    description: "Control who sees your data and for how long. Revoke access anytime. Auto-shares are listed here for easy revocation.",
  },
  {
    target: "a[href='/settings']",
    title: "Settings",
    description: "Manage your notification preferences, password, and account. You're all set — click Finish to start using MyZipVault!",
  },
];
