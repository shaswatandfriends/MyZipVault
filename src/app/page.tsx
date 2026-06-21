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
import { Button } from "@/components/ui/button";

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
    primary: "#2D5A3D",
    accent: "#C97B54",
    background: "#F2EDE4",
    textPrimary: "#2D5A3D",
    textSecondary: "#6A8A6A",
  },
  featureCards: [
    { icon: "FolderOpen", heading: "One Vault. Every Credential.", body: "Resume, certifications, immunizations, skill checklists, references — all in one secure, organized place. Upload once, share forever." },
    { icon: "Eye", heading: "Share On Your Terms.", body: "Approve every recruiter request individually. Set expiry dates. Revoke access instantly. Your credentials, your rules — always." },
    { icon: "ClipboardCheck", heading: "Skill Checklists, Done Right.", body: "Complete once, reuse for 30 days. Recruiters still pay to access, but you never redo the same checklist twice in a month." },
    { icon: "BadgeCheck", heading: "Verified. Trusted. Ready.", body: "Every uploaded credential goes through admin verification. Recruiters see a 'Verified' badge — and trust what they're placing." },
    { icon: "Timer", heading: "Never Let a Cert Expire.", body: "Automatic 30-day reminders before any credential expires. Stay ahead of compliance, never lose a contract over paperwork." },
    { icon: "Lock", heading: "Bank-Level Security.", body: "256-bit encryption at rest and in transit. HIPAA-aligned architecture. Pre-signed URLs that expire in 15 minutes. Your data is fortress-grade." },
  ],
  privacySection: [
    { icon: "Lock", heading: "Private by Design", body: "We never sell your data. We never share without your explicit consent. We never use your credentials for marketing." },
    { icon: "Trash2", heading: "Delete Forever, Anytime", body: "Suspend your account and all recruiter access is killed instantly. 30-day restore window. Permanent purge after — no traces left." },
    { icon: "ShieldCheck", heading: "Audit Everything", body: "Every view, every share, every download is logged. You can see exactly who accessed what, when. Total transparency." },
  ],
  howItWorks: [
    { title: "Build Your Vault", description: "Sign up free. Upload your resume, certifications, and references. Takes about 5 minutes to get started." },
    { title: "Receive Requests", description: "When a recruiter needs your compliance packet, you'll get an email + in-app notification showing exactly what they're asking for." },
    { title: "Approve & Share", description: "Review the request, set an expiry (7/14/30 days), and approve. Recruiter gets instant access. You can revoke anytime." },
    { title: "Get Placed Faster", description: "Recruiters love MyZipVault candidates because their packets are verified, complete, and ready to submit. You win the contract." },
  ],
  footer: {
    copyrightText: "© 2026 MyZipVault. All rights reserved.",
    hipaaBadgeText: "HIPAA-aligned · SOC 2 Type II · 256-bit Encryption",
  },
};

// Reusable Spatial UI eyebrow — terra gradient bar + uppercase tracked text
function SpatialEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="h-0.5 w-8 rounded-full"
        style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }}
      />
      <span
        className="text-xs font-bold uppercase"
        style={{ color: "var(--terra)", letterSpacing: "0.2em" }}
      >
        {children}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("candidate");
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_CONTENT);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/landing-content")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Object.keys(data).length > 0) setContent(data);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") console.error("Landing content fetch failed:", err);
      });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCandidate = viewMode === "candidate";

  return (
    <div className="relative min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}>
      {/* Mesh background — animated gradient orbs */}
      <div className="mesh-background" />

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION — Spatial header (transparent → material on scroll)
          ═══════════════════════════════════════════════════════════════ */}
      <nav
        className="sticky top-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: scrolled ? "var(--material-regular-bg)" : "transparent",
          backdropFilter: scrolled ? "blur(30px) saturate(1.8) brightness(1.04)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(30px) saturate(1.8) brightness(1.04)" : "none",
          borderBottom: scrolled ? "0.5px solid var(--material-regular-border)" : "0.5px solid transparent",
          boxShadow: scrolled ? "inset 0 1px 0 rgba(255,255,255,0.85), 0 4px 16px rgba(45,90,61,0.04)" : "none",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="flex items-center justify-center size-8 rounded-[10px] text-white text-base font-bold"
              style={{
                background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(201,123,84,0.32)",
                fontFamily: "'Lora', serif",
              }}
            >
              M
            </div>
            <span
              className="text-xl font-bold"
              style={{ fontFamily: "'Lora', serif", color: "var(--text-primary)", letterSpacing: "-0.02em" }}
            >
              MyZipVault
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium transition-colors no-underline hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium transition-colors no-underline hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              How It Works
            </a>
            <a
              href="#privacy"
              className="text-sm font-medium transition-colors no-underline hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              Privacy
            </a>

            {/* View Mode Toggle — spatial pill segment */}
            <div
              className="flex p-1 rounded-full"
              style={{
                background: "var(--material-thin-bg)",
                backdropFilter: "blur(20px) saturate(1.5)",
                WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                border: "0.5px solid var(--material-thin-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <button
                onClick={() => setViewMode("candidate")}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={
                  isCandidate
                    ? {
                        background: "linear-gradient(180deg, var(--primary-vivid) 0%, var(--primary) 100%)",
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(45,90,61,0.24)",
                      }
                    : { color: "var(--text-secondary)" }
                }
              >
                For Professionals
              </button>
              <button
                onClick={() => setViewMode("recruiter")}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={
                  !isCandidate
                    ? {
                        background: "linear-gradient(180deg, var(--primary-vivid) 0%, var(--primary) 100%)",
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(45,90,61,0.24)",
                      }
                    : { color: "var(--text-secondary)" }
                }
              >
                For Agencies
              </button>
            </div>

            <Button asChild size="sm">
              <Link href={isCandidate ? "/signup" : "/agency-signup"}>
                {isCandidate ? "Sign Up Free" : "Get Started"}
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", padding: "0.5rem" }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile menu — spatial material */}
        {mobileMenuOpen && (
          <div
            className="md:hidden p-6 flex flex-col gap-4"
            style={{
              background: "var(--material-thick-bg)",
              backdropFilter: "blur(44px) saturate(2) brightness(1.06)",
              WebkitBackdropFilter: "blur(44px) saturate(2) brightness(1.06)",
              borderTop: "0.5px solid var(--material-thick-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
            }}
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium no-underline" style={{ color: "var(--text-secondary)" }}>
              Features
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium no-underline" style={{ color: "var(--text-secondary)" }}>
              How It Works
            </a>
            <a href="#privacy" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium no-underline" style={{ color: "var(--text-secondary)" }}>
              Privacy
            </a>
            <div
              className="flex p-1 rounded-full mt-2"
              style={{
                background: "var(--material-thin-bg)",
                border: "0.5px solid var(--material-thin-border)",
              }}
            >
              <button
                onClick={() => { setViewMode("candidate"); setMobileMenuOpen(false); }}
                className="flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-all"
                style={
                  isCandidate
                    ? { background: "linear-gradient(180deg, var(--primary-vivid), var(--primary))", color: "#fff" }
                    : { color: "var(--text-secondary)" }
                }
              >
                Pros
              </button>
              <button
                onClick={() => { setViewMode("recruiter"); setMobileMenuOpen(false); }}
                className="flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-all"
                style={
                  !isCandidate
                    ? { background: "linear-gradient(180deg, var(--primary-vivid), var(--primary))", color: "#fff" }
                    : { color: "var(--text-secondary)" }
                }
              >
                Agencies
              </button>
            </div>
            <Button asChild className="w-full">
              <Link href={isCandidate ? "/signup" : "/agency-signup"}>
                {isCandidate ? "Sign Up Free" : "Get Started"}
              </Link>
            </Button>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          HERO — Spatial with mesh-background, terra eyebrow, pill CTAs
          ═══════════════════════════════════════════════════════════════ */}
      <section className="max-w-[1280px] mx-auto px-6 py-24 relative z-10">
        <div className="max-w-4xl">
          <SpatialEyebrow>
            {isCandidate ? "For Healthcare Professionals" : "For Staffing Agencies"}
          </SpatialEyebrow>

          <h1
            className="font-bold leading-[1.05] mb-6"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
              letterSpacing: "-0.025em",
              color: "var(--text-primary)",
            }}
          >
            {isCandidate ? content.hero.candidateHeadline : content.hero.recruiterHeadline}{" "}
            <span style={{ fontStyle: "italic", color: "var(--terra)" }}>
              {isCandidate ? content.hero.candidateGradientText : content.hero.recruiterGradientText}
            </span>
          </h1>

          <p
            className="leading-relaxed mb-10 max-w-2xl"
            style={{ fontSize: "1.25rem", color: "var(--text-secondary)" }}
          >
            {isCandidate ? content.hero.candidateSubheadline : content.hero.recruiterSubheadline}
          </p>

          <div className="flex gap-3 items-center flex-wrap">
            <Button asChild size="lg">
              <Link href={isCandidate ? "/signup" : "/agency-signup"}>
                {isCandidate ? content.hero.candidateCtaText : content.hero.recruiterCtaText}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>

          {/* Trust line — terra checkmark pills */}
          <div className="mt-12 pt-8 flex items-center gap-6 flex-wrap border-t" style={{ borderColor: "var(--border)" }}>
            {[
              { icon: ShieldCheck, label: content.hero.trustLine1 },
              { icon: Lock, label: content.hero.trustLine2 },
              { icon: BadgeCheck, label: content.hero.trustLine3 },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-2">
                <Icon className="size-4" style={{ color: "var(--terra)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STATS BAND — Dark forest green with terra numbers + spatial orbs
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative py-16 px-6 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1E3A26 0%, #2D5A3D 50%, #1E3A26 100%)", color: "#fff" }}
      >
        {/* Spatial orbs */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 400, height: 400, top: -100, right: -100, background: "radial-gradient(circle, rgba(74,124,89,0.6) 0%, rgba(74,124,89,0) 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 350, height: 350, bottom: -100, left: -80, background: "radial-gradient(circle, rgba(201,123,84,0.5) 0%, rgba(201,123,84,0) 70%)", filter: "blur(60px)" }}
        />

        <div className="relative z-10 max-w-[1280px] mx-auto grid gap-12" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {[
            { value: "10,000+", label: "Healthcare Professionals Verified" },
            { value: "99.9%", label: "Platform Uptime" },
            { value: "500+", label: "Healthcare Facilities Trust Us" },
            { value: "< 60s", label: "Average Verification Time" },
          ].map((stat, i) => (
            <div key={i}>
              <div
                className="mb-2"
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: "3rem",
                  fontWeight: 700,
                  color: "#E8A882",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-white/70"
                style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURES — Spatial cards with gradient icon containers
          ═══════════════════════════════════════════════════════════════ */}
      <section id="features" className="max-w-[1280px] mx-auto px-6 py-24 relative z-10">
        <div className="max-w-3xl mb-16">
          <SpatialEyebrow>What You Get</SpatialEyebrow>
          <h2
            className="font-bold leading-tight mb-6"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Built for the way healthcare actually works.
          </h2>
          <p className="leading-relaxed text-lg" style={{ color: "var(--text-secondary)" }}>
            Not a generic SaaS tool retrofitted for healthcare. MyZipVault was designed from day one for nurses, recruiters, and the unique compliance flow that connects them.
          </p>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {content.featureCards.map((feature, i) => (
            <div
              key={i}
              className="spatial-card p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                {/* Number — terra serif */}
                <span
                  className="font-bold"
                  style={{
                    fontFamily: "'Lora', serif",
                    fontSize: "0.875rem",
                    color: "var(--terra)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }} />
                {/* Icon — spatial gradient container */}
                <div
                  className="flex items-center justify-center size-10 rounded-[12px]"
                  style={
                    i % 2 === 0
                      ? {
                          background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
                          color: "#fff",
                        }
                      : {
                          background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(201,123,84,0.28)",
                          color: "#fff",
                        }
                  }
                >
                  <DynamicIcon name={feature.icon} fallback={ShieldCheck} className="size-5" />
                </div>
              </div>

              <h3
                className="font-bold mb-3"
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: "1.5rem",
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                  color: "var(--text-primary)",
                }}
              >
                {feature.heading}
              </h3>
              <p className="leading-relaxed" style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS — Material-thin band with terra numbers
          ═══════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="py-24 px-6 relative"
        style={{
          background: "var(--material-thin-bg)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        }}
      >
        <div className="max-w-[1280px] mx-auto relative z-10">
          <div className="max-w-3xl mb-16">
            <SpatialEyebrow>
              {isCandidate ? "For Professionals" : "For Agencies"}
            </SpatialEyebrow>
            <h2
              className="font-bold leading-tight"
              style={{
                fontFamily: "'Lora', serif",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
              }}
            >
              How it works.
            </h2>
          </div>

          <div className="grid gap-12" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            {content.howItWorks.map((step, i) => (
              <div key={i}>
                <div
                  className="mb-4"
                  style={{
                    fontFamily: "'Lora', serif",
                    fontSize: "4rem",
                    fontWeight: 700,
                    color: "var(--terra)",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="w-8 h-px mb-6" style={{ background: "var(--terra)" }} />
                <h3
                  className="font-bold mb-3"
                  style={{
                    fontFamily: "'Lora', serif",
                    fontSize: "1.5rem",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    color: "var(--text-primary)",
                  }}
                >
                  {step.title}
                </h3>
                <p className="leading-relaxed" style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
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
      <section id="privacy" className="max-w-[1280px] mx-auto px-6 py-24 relative z-10">
        <div className="max-w-3xl mb-16">
          <SpatialEyebrow>Privacy &amp; Trust</SpatialEyebrow>
          <h2
            className="font-bold leading-tight mb-6"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Your data. Your rules. Always.
          </h2>
          <p className="leading-relaxed text-lg" style={{ color: "var(--text-secondary)" }}>
            Healthcare credentials are deeply personal. We treat them that way — with bank-level encryption, granular sharing controls, and a permanent commitment to never sell your data.
          </p>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {content.privacySection.map((item, i) => (
            <div key={i} className="spatial-card p-8">
              <div
                className="flex items-center justify-center size-12 rounded-[14px] mb-4"
                style={{
                  background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
                  color: "#fff",
                }}
              >
                <DynamicIcon name={item.icon} fallback={ShieldCheck} className="size-6" />
              </div>
              <h3
                className="font-bold mb-3"
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: "1.375rem",
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                  color: "var(--text-primary)",
                }}
              >
                {item.heading}
              </h3>
              <p className="leading-relaxed" style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Trust badges row — spatial icons */}
        <div
          className="mt-16 pt-12 grid gap-8 border-t"
          style={{ borderTopColor: "var(--border)", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          {[
            { icon: ShieldCheck, label: "HIPAA Aligned", sub: "Full regulatory compliance" },
            { icon: BadgeCheck, label: "SOC 2 Type II", sub: "Certified security controls" },
            { icon: Lock, label: "256-bit Encryption", sub: "Bank-level data protection" },
            { icon: Shield, label: "Background Verified", sub: "Identity authentication" },
          ].map(({ icon: Icon, label, sub }, i) => (
            <div key={i} className="text-center">
              <div
                className="flex items-center justify-center size-14 mx-auto mb-3 rounded-[16px]"
                style={{
                  background: "var(--primary-light)",
                  border: "0.5px solid var(--status-green-border)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <Icon className="size-7" style={{ color: "var(--primary)" }} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{label}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA — Dark forest green band with terra CTA
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative py-24 px-6 text-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1E3A26 0%, #2D5A3D 50%, #1E3A26 100%)",
          color: "#fff",
        }}
      >
        {/* Spatial orbs */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 500, height: 500, top: -150, left: -100, background: "radial-gradient(circle, rgba(74,124,89,0.5) 0%, rgba(74,124,89,0) 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 400, height: 400, bottom: -100, right: -80, background: "radial-gradient(circle, rgba(201,123,84,0.4) 0%, rgba(201,123,84,0) 70%)", filter: "blur(70px)" }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Eyebrow — terra gradient bars */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #E8A882)" }} />
            <span className="text-xs font-bold uppercase" style={{ color: "#E8A882", letterSpacing: "0.2em" }}>
              Get Started Today
            </span>
            <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, #E8A882, transparent)" }} />
          </div>

          <h2
            className="font-bold leading-[1.05] mb-6"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {isCandidate ? (
              <>
                Build your vault.{" "}
                <span style={{ fontStyle: "italic", color: "#E8A882" }}>Free forever.</span>
              </>
            ) : (
              <>
                Place talent faster.{" "}
                <span style={{ fontStyle: "italic", color: "#E8A882" }}>Pay only for what you use.</span>
              </>
            )}
          </h2>
          <p className="text-white/85 leading-relaxed mb-10 max-w-2xl mx-auto text-lg">
            {isCandidate
              ? "Join thousands of healthcare professionals who trust MyZipVault with their credentials. No credit card. No commitments. Just a better way to manage your career."
              : "Stop chasing paperwork. Start placing talent. Credit-based pricing means you only pay when you actually access candidate data."}
          </p>

          {/* CTA — terra gradient pill button with depth-3 shadow */}
          <Link
            href={isCandidate ? "/signup" : "/agency-signup"}
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold transition-all no-underline relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
              color: "#fff",
              border: "0.5px solid rgba(201,123,84,0.5)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(201,123,84,0.32), 0 2px 4px rgba(201,123,84,0.18)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {isCandidate ? "Build Your Free Vault" : "Start Recruiting Smarter"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER — Dark forest green with terra accents
          ═══════════════════════════════════════════════════════════════ */}
      <footer
        className="px-6 pt-12 pb-8"
        style={{ background: "#1E3A26", color: "#fff" }}
      >
        <div className="max-w-[1280px] mx-auto">
          <div
            className="grid gap-12 pb-8 border-b"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", borderBottomColor: "rgba(255,255,255,0.1)" }}
          >
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="flex items-center justify-center size-7 rounded-[8px] text-white text-sm font-bold"
                  style={{
                    background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                    fontFamily: "'Lora', serif",
                  }}
                >
                  M
                </div>
                <span className="text-lg font-bold" style={{ fontFamily: "'Lora', serif" }}>MyZipVault</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-white/70">
                The trusted credential verification platform for healthcare professionals and staffing agencies.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold uppercase mb-4" style={{ color: "#E8A882", letterSpacing: "0.1em" }}>Platform</div>
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                <li><Link href="/signup" className="text-sm no-underline text-white/70 hover:text-white transition-colors">Sign Up</Link></li>
                <li><Link href="/login" className="text-sm no-underline text-white/70 hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/agency-signup" className="text-sm no-underline text-white/70 hover:text-white transition-colors">For Agencies</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold uppercase mb-4" style={{ color: "#E8A882", letterSpacing: "0.1em" }}>Company</div>
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                <li><Link href="/about" className="text-sm no-underline text-white/70 hover:text-white transition-colors">About</Link></li>
                <li><Link href="/privacy" className="text-sm no-underline text-white/70 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm no-underline text-white/70 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold uppercase mb-4" style={{ color: "#E8A882", letterSpacing: "0.1em" }}>Trust</div>
              <div className="flex flex-col gap-2 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4" style={{ color: "#E8A882" }} />
                  HIPAA Aligned
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="size-4" style={{ color: "#E8A882" }} />
                  256-bit Encryption
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="size-4" style={{ color: "#E8A882" }} />
                  SOC 2 Type II
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex justify-between items-center flex-wrap gap-4">
            <div className="text-xs text-white/60">{content.footer.copyrightText}</div>
            <div className="text-xs text-white/60" style={{ letterSpacing: "0.05em" }}>{content.footer.hipaaBadgeText}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
