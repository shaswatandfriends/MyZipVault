"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Search,
  ClipboardCheck,
  FileText,
  Bell,
  Users,
  Lock,
  Timer,
  Trash2,
  Eye,
  FolderOpen,
  BadgeCheck,
  Handshake,
  ArrowRight,
  Stethoscope,
  Briefcase,
  Shield,
  Zap,
  Clock,
  Upload,
  CheckCircle2,
  Menu,
  X,
} from "@/lib/icons";

interface LandingPageContent {
  hero: {
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
  };
  colors: {
    primary: string;
    accent: string;
    background: string;
    textPrimary: string;
    textSecondary: string;
  };
  featureCards: { icon: string; heading: string; body: string }[];
  privacySection: { icon: string; heading: string; body: string }[];
  howItWorks: { title: string; description: string }[];
  footer: {
    copyrightText: string;
    hipaaBadgeText: string;
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck,
  FileText,
  Bell,
  Users,
  Lock,
  Timer,
  Trash2,
  Eye,
  FolderOpen,
  BadgeCheck,
  Handshake,
  ShieldCheck,
  Shield,
  Zap,
  Clock,
  Upload,
  CheckCircle2,
};

function DynamicIcon({
  name,
  fallback: Fallback,
  className,
}: {
  name?: string;
  fallback: React.ComponentType<{ className?: string }>;
  className: string;
}) {
  const Icon = name && iconMap[name] ? iconMap[name] : Fallback;
  return <Icon className={className} />;
}

type ViewMode = "candidate" | "recruiter";

const DEFAULT_CONTENT: LandingPageContent = {
  hero: {
    candidateHeadline: "Your Credentials.",
    candidateGradientText: "Your Terms.",
    candidateSubheadline:
      "A secure vault for healthcare professionals to store, verify, and share credentials — with full control over who sees what, and for how long.",
    candidateCtaText: "Build Your Free Vault",
    recruiterHeadline: "Verified Talent.",
    recruiterGradientText: "On Demand.",
    recruiterSubheadline:
      "Stop chasing paperwork. Send one request, get a complete compliance packet back — verified, organized, and ready to place.",
    recruiterCtaText: "Start Recruiting Smarter",
    trustLine1: "HIPAA-aligned",
    trustLine2: "256-bit encryption",
    trustLine3: "You own your data",
  },
  colors: {
    primary: "#0B1F3A",
    accent: "#C9A961",
    background: "#F5F0E6",
    textPrimary: "#1A1A1A",
    textSecondary: "#3A3A3A",
  },
  featureCards: [
    {
      icon: "FolderOpen",
      heading: "One Vault. Every Credential.",
      body: "Resume, certifications, immunizations, skill checklists, references — all in one secure, organized place. Upload once, share forever.",
    },
    {
      icon: "Eye",
      heading: "Share On Your Terms.",
      body: "Approve every recruiter request individually. Set expiry dates. Revoke access instantly. Your credentials, your rules — always.",
    },
    {
      icon: "ClipboardCheck",
      heading: "Skill Checklists, Done Right.",
      body: "Complete once, reuse for 30 days. Recruiters still pay to access, but you never redo the same checklist twice in a month.",
    },
    {
      icon: "BadgeCheck",
      heading: "Verified. Trusted. Ready.",
      body: "Every uploaded credential goes through admin verification. Recruiters see a 'Verified' badge — and trust what they're placing.",
    },
    {
      icon: "Timer",
      heading: "Never Let a Cert Expire.",
      body: "Automatic 30-day reminders before any credential expires. Stay ahead of compliance, never lose a contract over paperwork.",
    },
    {
      icon: "Lock",
      heading: "Bank-Level Security.",
      body: "256-bit encryption at rest and in transit. HIPAA-aligned architecture. Pre-signed URLs that expire in 15 minutes. Your data is fortress-grade.",
    },
  ],
  privacySection: [
    {
      icon: "Lock",
      heading: "Private by Design",
      body: "We never sell your data. We never share without your explicit consent. We never use your credentials for marketing.",
    },
    {
      icon: "Trash2",
      heading: "Delete Forever, Anytime",
      body: "Suspend your account and all recruiter access is killed instantly. 30-day restore window. Permanent purge after — no traces left.",
    },
    {
      icon: "ShieldCheck",
      heading: "Audit Everything",
      body: "Every view, every share, every download is logged. You can see exactly who accessed what, when. Total transparency.",
    },
  ],
  howItWorks: [
    {
      title: "Build Your Vault",
      description: "Sign up free. Upload your resume, certifications, and references. Takes about 5 minutes to get started.",
    },
    {
      title: "Receive Requests",
      description: "When a recruiter needs your compliance packet, you'll get an email + in-app notification showing exactly what they're asking for.",
    },
    {
      title: "Approve & Share",
      description: "Review the request, set an expiry (7/14/30 days), and approve. Recruiter gets instant access. You can revoke anytime.",
    },
    {
      title: "Get Placed Faster",
      description: "Recruiters love MyZipVault candidates because their packets are verified, complete, and ready to submit. You win the contract.",
    },
  ],
  footer: {
    copyrightText: "© 2026 MyZipVault. All rights reserved.",
    hipaaBadgeText: "HIPAA-aligned · SOC 2 Type II · 256-bit Encryption",
  },
};

export default function LandingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("candidate");
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_CONTENT);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Fetch landing page content from superadmin-configured API
  useEffect(() => {
    fetch(`/api/superadmin/landing-page?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.content) {
          try {
            const parsed =
              typeof data.content === "string"
                ? JSON.parse(data.content)
                : data.content;
            setContent({ ...DEFAULT_CONTENT, ...parsed });
          } catch {
            // Keep defaults if parse fails
          }
        }
      })
      .catch((err) => {
        // Silent fail — defaults are fine
        if (process.env.NODE_ENV === "development") {
          console.error("Landing page content fetch failed:", err);
        }
      });
  }, []);

  // Detect scroll for navbar background change
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCandidate = viewMode === "candidate";

  return (
    <div
      style={{
        background: "var(--editorial-cream)",
        color: "var(--editorial-ink)",
        fontFamily: "var(--editorial-font-sans)",
        minHeight: "100vh",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION
          Sticky nav with subtle background change on scroll
          ═══════════════════════════════════════════════════════════════ */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: scrolled ? "var(--editorial-cream-warm)" : "transparent",
          borderBottom: scrolled ? "1px solid var(--editorial-rule-soft)" : "1px solid transparent",
          transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          backdropFilter: scrolled ? "blur(8px)" : "none",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "var(--editorial-navy)",
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--editorial-cream)",
                fontFamily: "var(--editorial-font-serif)",
                fontWeight: 700,
                fontSize: "1.25rem",
              }}
            >
              M
            </div>
            <span
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--editorial-navy)",
                letterSpacing: "-0.02em",
              }}
            >
              MyZipVault
            </span>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }} className="hidden md:flex">
            <a
              href="#features"
              style={{
                fontSize: "0.875rem",
                color: "var(--editorial-ink-soft)",
                textDecoration: "none",
                letterSpacing: "0.05em",
                transition: "color 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--editorial-navy)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--editorial-ink-soft)")}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              style={{
                fontSize: "0.875rem",
                color: "var(--editorial-ink-soft)",
                textDecoration: "none",
                letterSpacing: "0.05em",
                transition: "color 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--editorial-navy)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--editorial-ink-soft)")}
            >
              How It Works
            </a>
            <a
              href="#privacy"
              style={{
                fontSize: "0.875rem",
                color: "var(--editorial-ink-soft)",
                textDecoration: "none",
                letterSpacing: "0.05em",
                transition: "color 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--editorial-navy)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--editorial-ink-soft)")}
            >
              Privacy
            </a>

            {/* Toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--editorial-cream-cool)",
                borderRadius: "2px",
                padding: "2px",
                border: "1px solid var(--editorial-rule-soft)",
              }}
            >
              <button
                onClick={() => setViewMode("candidate")}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: isCandidate ? "var(--editorial-navy)" : "transparent",
                  color: isCandidate ? "var(--editorial-cream)" : "var(--editorial-ink-soft)",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                For Professionals
              </button>
              <button
                onClick={() => setViewMode("recruiter")}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: !isCandidate ? "var(--editorial-navy)" : "transparent",
                  color: !isCandidate ? "var(--editorial-cream)" : "var(--editorial-ink-soft)",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                For Agencies
              </button>
            </div>

            <Link
              href={isCandidate ? "/signup" : "/agency-signup"}
              style={{
                padding: "0.625rem 1.5rem",
                background: "var(--editorial-navy)",
                color: "var(--editorial-cream)",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: "2px",
                border: "1px solid var(--editorial-navy)",
                transition: "all 150ms",
                display: "inline-block",
              }}
            >
              {isCandidate ? "Sign Up Free" : "Get Started"}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--editorial-navy)",
              cursor: "pointer",
              padding: "0.5rem",
            }}
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{
              background: "var(--editorial-cream-warm)",
              borderTop: "1px solid var(--editorial-rule-soft)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ color: "var(--editorial-ink-soft)", textDecoration: "none", fontSize: "0.875rem" }}>
              Features
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={{ color: "var(--editorial-ink-soft)", textDecoration: "none", fontSize: "0.875rem" }}>
              How It Works
            </a>
            <a href="#privacy" onClick={() => setMobileMenuOpen(false)} style={{ color: "var(--editorial-ink-soft)", textDecoration: "none", fontSize: "0.875rem" }}>
              Privacy
            </a>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                onClick={() => {
                  setViewMode("candidate");
                  setMobileMenuOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: isCandidate ? "var(--editorial-navy)" : "transparent",
                  color: isCandidate ? "var(--editorial-cream)" : "var(--editorial-ink-soft)",
                  border: "1px solid var(--editorial-navy)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Pros
              </button>
              <button
                onClick={() => {
                  setViewMode("recruiter");
                  setMobileMenuOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: !isCandidate ? "var(--editorial-navy)" : "transparent",
                  color: !isCandidate ? "var(--editorial-cream)" : "var(--editorial-ink-soft)",
                  border: "1px solid var(--editorial-navy)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Agencies
              </button>
            </div>
            <Link
              href={isCandidate ? "/signup" : "/agency-signup"}
              style={{
                padding: "0.75rem",
                background: "var(--editorial-gold)",
                color: "var(--editorial-navy)",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: "2px",
                textAlign: "center",
                display: "block",
              }}
            >
              {isCandidate ? "Sign Up Free" : "Get Started"}
            </Link>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          HERO
          Magazine-style: eyebrow + huge serif headline + body + CTA
          ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "6rem 1.5rem 4rem",
        }}
      >
        <div style={{ maxWidth: "64rem" }}>
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--editorial-gold-dark)",
              }}
            >
              {isCandidate ? "For Healthcare Professionals" : "For Staffing Agencies"}
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--editorial-font-serif)",
              fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: "var(--editorial-navy)",
              marginBottom: "1.5rem",
              margin: "0 0 1.5rem 0",
            }}
          >
            {isCandidate ? content.hero.candidateHeadline : content.hero.recruiterHeadline}{" "}
            <span style={{ fontStyle: "italic", color: "var(--editorial-gold-dark)" }}>
              {isCandidate ? content.hero.candidateGradientText : content.hero.recruiterGradientText}
            </span>
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "1.25rem",
              lineHeight: 1.6,
              color: "var(--editorial-ink-soft)",
              maxWidth: "42rem",
              marginBottom: "2.5rem",
            }}
          >
            {isCandidate ? content.hero.candidateSubheadline : content.hero.recruiterSubheadline}
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href={isCandidate ? "/signup" : "/agency-signup"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 2rem",
                background: "var(--editorial-navy)",
                color: "var(--editorial-cream)",
                fontSize: "0.875rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: "2px",
                border: "1px solid var(--editorial-navy)",
                transition: "all 250ms",
              }}
            >
              {isCandidate ? content.hero.candidateCtaText : content.hero.recruiterCtaText}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "1rem 2rem",
                background: "transparent",
                color: "var(--editorial-navy)",
                fontSize: "0.875rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: "2px",
                border: "1px solid var(--editorial-navy)",
                transition: "all 250ms",
              }}
            >
              Sign In
            </Link>
          </div>

          {/* Trust line */}
          <div
            style={{
              marginTop: "3rem",
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
              paddingTop: "2rem",
              borderTop: "1px solid var(--editorial-rule-soft)",
            }}
          >
            {[
              { icon: ShieldCheck, label: content.hero.trustLine1 },
              { icon: Lock, label: content.hero.trustLine2 },
              { icon: BadgeCheck, label: content.hero.trustLine3 },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon className="size-4" style={{ color: "var(--editorial-gold-dark)" }} />
                <span style={{ fontSize: "0.875rem", color: "var(--editorial-ink-soft)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STATS BAND — Dark navy section with key numbers
          ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "var(--editorial-navy)",
          color: "var(--editorial-cream)",
          padding: "4rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "3rem",
          }}
        >
          {[
            { value: "10,000+", label: "Healthcare Professionals Verified" },
            { value: "99.9%", label: "Platform Uptime" },
            { value: "500+", label: "Healthcare Facilities Trust Us" },
            { value: "< 60s", label: "Average Verification Time" },
          ].map((stat, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: "var(--editorial-font-serif)",
                  fontSize: "3rem",
                  fontWeight: 700,
                  color: "var(--editorial-gold)",
                  lineHeight: 1,
                  marginBottom: "0.5rem",
                  letterSpacing: "-0.02em",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--editorial-cream)",
                  opacity: 0.7,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURES
          Magazine-style grid with editorial cards
          ═══════════════════════════════════════════════════════════════ */}
      <section id="features" style={{ padding: "6rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ maxWidth: "48rem", marginBottom: "4rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--editorial-gold-dark)",
              }}
            >
              What You Get
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--editorial-font-serif)",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--editorial-navy)",
              marginBottom: "1.5rem",
            }}
          >
            Built for the way healthcare actually works.
          </h2>
          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.7,
              color: "var(--editorial-ink-soft)",
            }}
          >
            Not a generic SaaS tool retrofitted for healthcare. MyZipVault was designed from day one for nurses, recruiters, and the unique compliance flow that connects them.
          </p>
        </div>

        {/* Feature grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {content.featureCards.map((feature, i) => (
            <div
              key={i}
              style={{
                background: "var(--editorial-cream-warm)",
                border: "1px solid var(--editorial-rule-soft)",
                borderRadius: "2px",
                padding: "2.5rem",
                transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(11, 31, 58, 0.08), 0 4px 8px rgba(11, 31, 58, 0.04)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(11, 31, 58, 0.04)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Number */}
              <div
                style={{
                  fontFamily: "var(--editorial-font-serif)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--editorial-gold-dark)",
                  marginBottom: "1.5rem",
                  letterSpacing: "0.1em",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* Icon */}
              <DynamicIcon
                name={feature.icon}
                fallback={ShieldCheck}
                className="size-8"
              />
              <div style={{ color: "var(--editorial-navy)" }}>
                {/* Workaround: DynamicIcon doesn't take style — wrap with parent color */}
              </div>

              {/* Heading */}
              <h3
                style={{
                  fontFamily: "var(--editorial-font-serif)",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "var(--editorial-navy)",
                  marginTop: "1rem",
                  marginBottom: "0.75rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {feature.heading}
              </h3>

              {/* Body */}
              <p
                style={{
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  color: "var(--editorial-ink-soft)",
                }}
              >
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS — Numbered editorial layout
          ═══════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        style={{
          background: "var(--editorial-cream-cool)",
          padding: "6rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          {/* Section header */}
          <div style={{ maxWidth: "48rem", marginBottom: "4rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--editorial-gold-dark)",
                }}
              >
                {isCandidate ? "For Professionals" : "For Agencies"}
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
              }}
            >
              How it works.
            </h2>
          </div>

          {/* Steps */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "3rem",
            }}
          >
            {content.howItWorks.map((step, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: "var(--editorial-font-serif)",
                    fontSize: "4rem",
                    fontWeight: 700,
                    color: "var(--editorial-gold)",
                    lineHeight: 1,
                    marginBottom: "1rem",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    width: "32px",
                    height: "1px",
                    background: "var(--editorial-rule)",
                    marginBottom: "1.5rem",
                  }}
                />
                <h3
                  style={{
                    fontFamily: "var(--editorial-font-serif)",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "var(--editorial-navy)",
                    marginBottom: "0.75rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    lineHeight: 1.7,
                    color: "var(--editorial-ink-soft)",
                  }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PRIVACY & TRUST
          ═══════════════════════════════════════════════════════════════ */}
      <section id="privacy" style={{ padding: "6rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ maxWidth: "48rem", marginBottom: "4rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--editorial-gold-dark)",
              }}
            >
              Privacy & Trust
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--editorial-font-serif)",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--editorial-navy)",
              marginBottom: "1.5rem",
            }}
          >
            Your data. Your rules. Always.
          </h2>
          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.7,
              color: "var(--editorial-ink-soft)",
            }}
          >
            Healthcare credentials are deeply personal. We treat them that way — with bank-level encryption, granular sharing controls, and a permanent commitment to never sell your data.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {content.privacySection.map((item, i) => (
            <div
              key={i}
              style={{
                background: "var(--editorial-paper)",
                border: "1px solid var(--editorial-rule-soft)",
                borderRadius: "2px",
                padding: "2.5rem",
              }}
            >
              <DynamicIcon
                name={item.icon}
                fallback={ShieldCheck}
                className="size-7"
              />
              <h3
                style={{
                  fontFamily: "var(--editorial-font-serif)",
                  fontSize: "1.375rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "var(--editorial-navy)",
                  marginTop: "1rem",
                  marginBottom: "0.75rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {item.heading}
              </h3>
              <p
                style={{
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  color: "var(--editorial-ink-soft)",
                }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Trust badges row */}
        <div
          style={{
            marginTop: "4rem",
            paddingTop: "3rem",
            borderTop: "1px solid var(--editorial-rule-soft)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "2rem",
          }}
        >
          {[
            { icon: ShieldCheck, label: "HIPAA Aligned", sub: "Full regulatory compliance" },
            { icon: BadgeCheck, label: "SOC 2 Type II", sub: "Certified security controls" },
            { icon: Lock, label: "256-bit Encryption", sub: "Bank-level data protection" },
            { icon: Shield, label: "Background Verified", sub: "Identity authentication" },
          ].map(({ icon: Icon, label, sub }, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <Icon
                className="size-8"
                style={{
                  color: "var(--editorial-navy)",
                  margin: "0 auto 0.75rem",
                  display: "block",
                }}
              />
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--editorial-navy)",
                  marginBottom: "0.25rem",
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--editorial-ink-muted)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA — Big editorial statement
          ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "var(--editorial-navy)",
          color: "var(--editorial-cream)",
          padding: "6rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "2rem",
            }}
          >
            <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--editorial-gold)",
              }}
            >
              Get Started Today
            </span>
            <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
          </div>
          <h2
            style={{
              fontFamily: "var(--editorial-font-serif)",
              fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              marginBottom: "1.5rem",
            }}
          >
            {isCandidate ? (
              <>
                Build your vault.{" "}
                <span style={{ fontStyle: "italic", color: "var(--editorial-gold)" }}>Free forever.</span>
              </>
            ) : (
              <>
                Place talent faster.{" "}
                <span style={{ fontStyle: "italic", color: "var(--editorial-gold)" }}>Pay only for what you use.</span>
              </>
            )}
          </h2>
          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.7,
              color: "var(--editorial-cream)",
              opacity: 0.85,
              marginBottom: "2.5rem",
              maxWidth: "36rem",
              margin: "0 auto 2.5rem",
            }}
          >
            {isCandidate
              ? "Join thousands of healthcare professionals who trust MyZipVault with their credentials. No credit card. No commitments. Just a better way to manage your career."
              : "Stop chasing paperwork. Start placing talent. Credit-based pricing means you only pay when you actually access candidate data."}
          </p>
          <Link
            href={isCandidate ? "/signup" : "/agency-signup"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1.125rem 2.5rem",
              background: "var(--editorial-gold)",
              color: "var(--editorial-navy)",
              fontSize: "0.875rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
              borderRadius: "2px",
              transition: "all 250ms",
            }}
          >
            {isCandidate ? "Build Your Free Vault" : "Start Recruiting Smarter"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          background: "var(--editorial-navy-dark)",
          color: "var(--editorial-cream)",
          padding: "3rem 1.5rem 2rem",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "3rem",
              paddingBottom: "2rem",
              borderBottom: "1px solid rgba(245, 240, 230, 0.1)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "var(--editorial-gold)",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--editorial-navy)",
                    fontFamily: "var(--editorial-font-serif)",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  M
                </div>
                <span
                  style={{
                    fontFamily: "var(--editorial-font-serif)",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                  }}
                >
                  MyZipVault
                </span>
              </div>
              <p style={{ fontSize: "0.875rem", opacity: 0.7, lineHeight: 1.6, maxWidth: "20rem" }}>
                The trusted credential verification platform for healthcare professionals and staffing agencies.
              </p>
            </div>

            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--editorial-gold)",
                  marginBottom: "1rem",
                }}
              >
                Platform
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><Link href="/signup" style={{ color: "var(--editorial-cream)", opacity: 0.7, fontSize: "0.875rem", textDecoration: "none" }}>Sign Up</Link></li>
                <li><Link href="/login" style={{ color: "var(--editorial-cream)", opacity: 0.7, fontSize: "0.875rem", textDecoration: "none" }}>Sign In</Link></li>
                <li><Link href="/agency-signup" style={{ color: "var(--editorial-cream)", opacity: 0.7, fontSize: "0.875rem", textDecoration: "none" }}>For Agencies</Link></li>
              </ul>
            </div>

            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--editorial-gold)",
                  marginBottom: "1rem",
                }}
              >
                Company
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><Link href="/about" style={{ color: "var(--editorial-cream)", opacity: 0.7, fontSize: "0.875rem", textDecoration: "none" }}>About</Link></li>
                <li><Link href="/privacy" style={{ color: "var(--editorial-cream)", opacity: 0.7, fontSize: "0.875rem", textDecoration: "none" }}>Privacy Policy</Link></li>
                <li><Link href="/terms" style={{ color: "var(--editorial-cream)", opacity: 0.7, fontSize: "0.875rem", textDecoration: "none" }}>Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--editorial-gold)",
                  marginBottom: "1rem",
                }}
              >
                Trust
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem", opacity: 0.7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheck className="size-4" style={{ color: "var(--editorial-gold)" }} />
                  HIPAA Aligned
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Lock className="size-4" style={{ color: "var(--editorial-gold)" }} />
                  256-bit Encryption
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <BadgeCheck className="size-4" style={{ color: "var(--editorial-gold)" }} />
                  SOC 2 Type II
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: "2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
              {content.footer.copyrightText}
            </div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6, letterSpacing: "0.05em" }}>
              {content.footer.hipaaBadgeText}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
