// ─── Auth Page Configuration Types & Defaults ─────────────────────────
// This file is the single source of truth for auth page content structure.
// Used by: API routes, admin editor, auth page components, and the slideshow panel.

export interface QuoteCard {
  text: string;
  attribution: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface PageContent {
  tagline: string;
  trustPoints: string[];
  quoteCard?: QuoteCard;
  statsCard?: StatItem[];
}

export interface BrandingConfig {
  platformName: string;
  logoText: string;
  logoUrl: string;
}

export interface AuthPageConfig {
  branding: BrandingConfig;
  slideshowImages: string[];
  pages: {
    login: PageContent;
    signup: PageContent;
    agencySignup: PageContent;
    onboard: PageContent;
  };
}

// ─── Default Values (fallback when DB has no config) ──────────────────
export const DEFAULT_AUTH_PAGE_CONFIG: AuthPageConfig = {
  branding: {
    platformName: "MyZipVault",
    logoText: "ZV",
    logoUrl: "",
  },
  slideshowImages: [
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80",
    "https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=800&q=80",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&q=80",
    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&q=80",
  ],
  pages: {
    login: {
      tagline: "Your Credentials. Your Control.",
      trustPoints: [
        "HIPAA-Aligned Security",
        "You Control Access",
        "100% Free for Nurses",
      ],
      quoteCard: {
        text: "MyZipVault saved me hours every time I start a new travel assignment.",
        attribution: "Sarah K., ICU Travel Nurse",
      },
    },
    signup: {
      tagline: "Own Your Career. Protect Your Data.",
      trustPoints: [
        "Complete Checklists Once",
        "Store All Your Credentials",
        "Share Only What You Choose",
      ],
      statsCard: [
        { value: "500+", label: "Active Healthcare Professionals" },
        { value: "30 Days", label: "Checklist Validity" },
        { value: "100%", label: "Free for Candidates" },
      ],
    },
    agencySignup: {
      tagline: "The Smarter Way to Verify Healthcare Credentials.",
      trustPoints: [
        "Real-Time Compliance Tracking",
        "Credit-Based, Pay As You Go",
        "HIPAA-Aligned Infrastructure",
      ],
      statsCard: [
        { value: "1 Credit", label: "Per Document" },
        { value: "30 Days", label: "Checklist Validity" },
        { value: "100%", label: "Free for Candidates" },
      ],
    },
    onboard: {
      tagline: "Welcome to Your Professional Vault.",
      trustPoints: [
        "Your Data Stays Private",
        "Share Only With Trusted Agencies",
        "Credentials Stored Securely",
      ],
      quoteCard: {
        text: "I finally have one place for all my certifications and references.",
        attribution: "Maria L., Travel ER Nurse",
      },
    },
  },
};

// ─── PlatformSetting key used to store the config ─────────────────────
export const AUTH_PAGE_CONFIG_KEY = "auth_page_config";

// ─── Helper to deep-merge DB config over defaults ─────────────────────
export function mergeWithDefaults(dbConfig: Partial<AuthPageConfig>): AuthPageConfig {
  return {
    branding: {
      ...DEFAULT_AUTH_PAGE_CONFIG.branding,
      ...(dbConfig.branding || {}),
    },
    slideshowImages:
      dbConfig.slideshowImages && dbConfig.slideshowImages.length > 0
        ? dbConfig.slideshowImages
        : DEFAULT_AUTH_PAGE_CONFIG.slideshowImages,
    pages: {
      login: {
        ...DEFAULT_AUTH_PAGE_CONFIG.pages.login,
        ...(dbConfig.pages?.login || {}),
        trustPoints:
          dbConfig.pages?.login?.trustPoints && dbConfig.pages.login.trustPoints.length > 0
            ? dbConfig.pages.login.trustPoints
            : DEFAULT_AUTH_PAGE_CONFIG.pages.login.trustPoints,
      },
      signup: {
        ...DEFAULT_AUTH_PAGE_CONFIG.pages.signup,
        ...(dbConfig.pages?.signup || {}),
        trustPoints:
          dbConfig.pages?.signup?.trustPoints && dbConfig.pages.signup.trustPoints.length > 0
            ? dbConfig.pages.signup.trustPoints
            : DEFAULT_AUTH_PAGE_CONFIG.pages.signup.trustPoints,
        statsCard:
          dbConfig.pages?.signup?.statsCard && dbConfig.pages.signup.statsCard!.length > 0
            ? dbConfig.pages.signup.statsCard
            : DEFAULT_AUTH_PAGE_CONFIG.pages.signup.statsCard,
      },
      agencySignup: {
        ...DEFAULT_AUTH_PAGE_CONFIG.pages.agencySignup,
        ...(dbConfig.pages?.agencySignup || {}),
        trustPoints:
          dbConfig.pages?.agencySignup?.trustPoints && dbConfig.pages.agencySignup.trustPoints.length > 0
            ? dbConfig.pages.agencySignup.trustPoints
            : DEFAULT_AUTH_PAGE_CONFIG.pages.agencySignup.trustPoints,
        statsCard:
          dbConfig.pages?.agencySignup?.statsCard && dbConfig.pages.agencySignup.statsCard!.length > 0
            ? dbConfig.pages.agencySignup.statsCard
            : DEFAULT_AUTH_PAGE_CONFIG.pages.agencySignup.statsCard,
      },
      onboard: {
        ...DEFAULT_AUTH_PAGE_CONFIG.pages.onboard,
        ...(dbConfig.pages?.onboard || {}),
        trustPoints:
          dbConfig.pages?.onboard?.trustPoints && dbConfig.pages.onboard.trustPoints.length > 0
            ? dbConfig.pages.onboard.trustPoints
            : DEFAULT_AUTH_PAGE_CONFIG.pages.onboard.trustPoints,
      },
    },
  };
}
