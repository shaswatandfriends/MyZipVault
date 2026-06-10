// ─── Landing Page Configuration Types & Defaults ──────────────────────
// This file is the single source of truth for landing page content structure.
// Used by: API routes, admin editor, landing page components.

export interface HeroContent {
  candidateHeadline: string;
  candidateGradientText: string;
  candidateSubheadline: string;
  candidateCtaText: string;
  recruiterHeadline: string;
  recruiterGradientText: string;
  recruiterSubheadline: string;
  recruiterCtaText: string;
  trustLine1: string;
  trustLine2: string;
  trustLine3: string;
}

export interface ColorSettings {
  primary: string;
  accent: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
}

export interface FeatureCard {
  icon: string;
  heading: string;
  body: string;
}

export interface PrivacyItem {
  icon: string;
  heading: string;
  body: string;
}

export interface HowItWorksStep {
  title: string;
  description: string;
}

export interface FooterContent {
  copyrightText: string;
  hipaaBadgeText: string;
}

export interface ContactSocial {
  linkedinUrl: string;
  facebookUrl: string;
  whatsappNumber: string;
}

export interface RecruiterFeatureCard {
  icon: string;
  heading: string;
  body: string;
}

export interface RecruiterHowItWorksStep {
  title: string;
  description: string;
}

export interface LandingPageConfig {
  hero: HeroContent;
  colors: ColorSettings;
  featureCards: FeatureCard[];
  privacySection: PrivacyItem[];
  howItWorks: HowItWorksStep[];
  footer: FooterContent;
  contactSocial: ContactSocial;
  // Recruiter-specific sections (separate from candidate)
  recruiterFeatureCards: RecruiterFeatureCard[];
  recruiterHowItWorks: RecruiterHowItWorksStep[];
}

// ─── Icon Options ───────────────────────────────────────────────────
export const ICON_OPTIONS = [
  "ClipboardCheck",
  "FileText",
  "Bell",
  "Users",
  "Lock",
  "Shield",
  "Eye",
  "FolderOpen",
  "BadgeCheck",
  "Handshake",
  "Timer",
  "Trash2",
  "Zap",
  "Upload",
  "CheckCircle2",
  "Stethoscope",
  "Briefcase",
  "Clock",
  "ShieldCheck",
  "ArrowRight",
  "Heart",
  "Star",
  "Award",
  "Globe",
  "Search",
  "Settings",
  "Link2",
  "Database",
  "Server",
  "Code",
];

// ─── Default Values (fallback when DB has no config) ──────────────────
export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  hero: {
    candidateHeadline: "Stop Filling Out the Same Checklists.",
    candidateGradientText: "Own Your Career",
    candidateSubheadline:
      "The secure, candidate-controlled vault for healthcare professionals. Complete your skills checklists once, store your credentials, collect references, and share with recruiters on your terms.",
    candidateCtaText: "Create Your Free Vault",
    recruiterHeadline: "Stop Chasing Nurses for",
    recruiterGradientText: "Checklists and References.",
    recruiterSubheadline:
      "MyZipVault automates the healthcare compliance packet. Request a checklist, credentials, and references — and watch them complete in real time. No more endless email threads.",
    recruiterCtaText: "Get Started",
    trustLine1: "HIPAA-Aligned Security",
    trustLine2: "You Control Access",
    trustLine3: "100% Free for Nurses",
  },
  colors: {
    primary: "#166534",
    accent: "#0D9488",
    background: "#F8F7F4",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
  },
  featureCards: [
    {
      icon: "ClipboardCheck",
      heading: "Complete Once, Reuse for 30 Days",
      body: "Receive a checklist request from an agency. Rate yourself on our industry-standard lists. Once submitted, it's saved in your vault. If another agency asks for the same list within 30 days, just click Share. No retakes. No redundancy.",
    },
    {
      icon: "FileText",
      heading: "Never Start From Scratch",
      body: "Upload your current resume and our builder auto-fills your profile. Next time you need to add a new assignment, click Add Experience. Edit, update, and export a formatted resume in seconds.",
    },
    {
      icon: "Bell",
      heading: "Never Let a Cert Expire Unnoticed",
      body: "Upload your BLS, ACLS, RN License, and Immunizations. Turn on expiration reminders and we'll alert you 30 days before it's time to renew.",
    },
    {
      icon: "Users",
      heading: "Build Your Verified Reference Network",
      body: "Connect with your managers and request an evaluation. They get a free vault too. Store their verified signed reference in your vault, ready to share the second a recruiter asks.",
    },
  ],
  privacySection: [
    {
      icon: "Lock",
      heading: "Explicit Consent",
      body: "A recruiter only sees what you share. Nothing is ever visible by default.",
    },
    {
      icon: "Timer",
      heading: "Expiring Access",
      body: "You set the timer — 7, 14, or 30 days. Access ends automatically.",
    },
    {
      icon: "Trash2",
      heading: "No Data Hoarding",
      body: "If you delete your account, all recruiter access is killed instantly.",
    },
  ],
  howItWorks: [
    {
      title: "Create Your Vault",
      description:
        "Sign up free. Upload your resume and our builder auto-fills your profile. Add your BLS, ACLS, RN License, and immunizations in minutes.",
    },
    {
      title: "Complete Your Checklists",
      description:
        "When an agency requests a skills checklist, fill it out once. It stays in your vault for 30 days. Next agency asks? Click Share. No retakes.",
    },
    {
      title: "Share On Your Terms",
      description:
        "Grant expiring access to any recruiter — 7, 14, or 30 days. Revoke anytime. They see only what you allow. Nothing more.",
    },
  ],
  footer: {
    copyrightText: "\u00A9 2026 MyZipVault. All rights reserved.",
    hipaaBadgeText: "HIPAA-Aligned Security",
  },
  contactSocial: {
    linkedinUrl: "",
    facebookUrl: "",
    whatsappNumber: "",
  },
  recruiterFeatureCards: [
    {
      icon: "Eye",
      heading: "Real-Time Tracking",
      body: "See exactly who opened your request, who's currently filling it out at 30% or 50% or 90%, and who has submitted. No more guessing.",
    },
    {
      icon: "FolderOpen",
      heading: "Instant Document Access",
      body: "Request a checklist and BLS. If the nurse shares their ACLS and resume too, unlock each extra verified document for just 1 credit.",
    },
    {
      icon: "BadgeCheck",
      heading: "Verified References",
      body: "When nurses request references from their managers, the manager joins the vault. Next time you need a reference from that manager, it's already verified.",
    },
    {
      icon: "Handshake",
      heading: "HIPAA-Aligned Sharing",
      body: "Candidates set expiring access links. You get compliant verifiable documents without storing sensitive data in your own inbox.",
    },
  ],
  recruiterHowItWorks: [
    {
      title: "Send a Request",
      description:
        "Request a checklist, credentials, and references from any nurse on the platform. One request, all documents.",
    },
    {
      title: "Track in Real Time",
      description:
        "See who opened your request, who is at 30% or 90%, and who has submitted. No more guessing or follow-up emails.",
    },
    {
      title: "Access Verified Documents",
      description:
        "Nurses share via expiring, HIPAA-aligned links. You get compliant, verified documents without storing sensitive data.",
    },
  ],
};

// ─── PlatformSetting key used to store the config ─────────────────────
export const LANDING_PAGE_CONFIG_KEY = "landing_page_config";

// ─── Helper to deep-merge DB config over defaults ─────────────────────
export function mergeWithDefaults(dbConfig: Partial<LandingPageConfig>): LandingPageConfig {
  return {
    hero: {
      ...DEFAULT_LANDING_PAGE_CONFIG.hero,
      ...(dbConfig.hero || {}),
    },
    colors: {
      ...DEFAULT_LANDING_PAGE_CONFIG.colors,
      ...(dbConfig.colors || {}),
    },
    featureCards:
      dbConfig.featureCards && dbConfig.featureCards.length > 0
        ? dbConfig.featureCards
        : DEFAULT_LANDING_PAGE_CONFIG.featureCards,
    privacySection:
      dbConfig.privacySection && dbConfig.privacySection.length > 0
        ? dbConfig.privacySection
        : DEFAULT_LANDING_PAGE_CONFIG.privacySection,
    howItWorks:
      dbConfig.howItWorks && dbConfig.howItWorks.length > 0
        ? dbConfig.howItWorks
        : DEFAULT_LANDING_PAGE_CONFIG.howItWorks,
    footer: {
      ...DEFAULT_LANDING_PAGE_CONFIG.footer,
      ...(dbConfig.footer || {}),
    },
    contactSocial: {
      ...DEFAULT_LANDING_PAGE_CONFIG.contactSocial,
      ...(dbConfig.contactSocial || {}),
    },
    recruiterFeatureCards:
      dbConfig.recruiterFeatureCards && dbConfig.recruiterFeatureCards.length > 0
        ? dbConfig.recruiterFeatureCards
        : DEFAULT_LANDING_PAGE_CONFIG.recruiterFeatureCards,
    recruiterHowItWorks:
      dbConfig.recruiterHowItWorks && dbConfig.recruiterHowItWorks.length > 0
        ? dbConfig.recruiterHowItWorks
        : DEFAULT_LANDING_PAGE_CONFIG.recruiterHowItWorks,
  };
}
