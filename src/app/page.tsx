"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  FadeIn, StaggerChildren, StaggerItem, CountUp, FadeInOnScroll, TiltCard, ScaleIn,
} from "@/components/motion";
import {
  ShieldCheck, Search, ClipboardCheck, FileText, Bell, Users, Lock, Timer, Trash2,
  Eye, FolderOpen, BadgeCheck, Handshake, ArrowRight, Stethoscope, Briefcase, Shield,
  Zap, Clock, Upload, CheckCircle2, Menu, X, Mail, Phone, Star, Database,
  FileSignature, Send, MessageSquare, Globe, Sparkles, TrendingUp, Award,
} from "@/lib/icons";
import { ICON_MAP } from "@/lib/landing-page-icons";
import { DEFAULT_LANDING_PAGE_CONFIG, mergeWithDefaults, type LandingPageConfig } from "@/lib/landing-page-config";

// ─── Component ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [viewMode, setViewMode] = useState<"candidate" | "recruiter">("candidate");
  const [content, setContent] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [socialLinks, setSocialLinks] = useState({ linkedinUrl: "", facebookUrl: "", whatsappNumber: "" });

  useEffect(() => {
    fetch("/api/landing-content")
      .then((r) => r.json())
      .then((data) => setContent(mergeWithDefaults(data)))
      .catch(() => {});

    fetch("/api/platform/public-settings")
      .then((r) => r.json())
      .then((data) => setSocialLinks({
        linkedinUrl: data.social_linkedin_url || "",
        facebookUrl: data.social_facebook_url || "",
        whatsappNumber: data.whatsapp_number || "",
      }))
      .catch(() => {});

    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCandidate = viewMode === "candidate";
  const hero = isCandidate ? {
    headline: content.hero.candidateHeadline,
    gradientText: content.hero.candidateGradientText,
    sub: content.hero.candidateSubheadline,
    cta: content.hero.candidateCtaText,
    link: "/signup",
  } : {
    headline: content.hero.recruiterHeadline,
    gradientText: content.hero.recruiterGradientText,
    sub: content.hero.recruiterSubheadline,
    cta: content.hero.recruiterCtaText,
    link: "/agency-signup",
  };

  return (
    <div className="min-h-screen">
      <div className="mesh-background" />

      {/* ═════════════════════════════════════════════════════════════════
          1. NAV BAR
      ══════════════════════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[var(--material-regular-bg)] backdrop-blur-xl border-b border-[var(--material-thin-border)]" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white font-bold text-lg" style={{ fontFamily: "var(--font-clash)" }}>M</div>
            <span className="font-semibold text-[var(--text-primary)] text-lg" style={{ fontFamily: "var(--font-clash)" }}>MyZipVault</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <a href="#marketplace" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Marketplace</a>
            <a href="#features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</a>
            <a href="#verification" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Verification</a>
            <a href="#reputation" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Reputation</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-[var(--material-thin-bg)] rounded-full p-1 border border-[var(--material-thin-border)]">
              <button onClick={() => setViewMode("candidate")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isCandidate ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)]"}`}>For Candidates</button>
              <button onClick={() => setViewMode("recruiter")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!isCandidate ? "bg-[var(--terra)] text-white" : "text-[var(--text-secondary)]"}`}>For Recruiters</button>
            </div>
            <Link href={isCandidate ? "/signup" : "/agency-signup"}>
              <button className="spatial-button primary sm">{hero.cta}</button>
            </Link>
            <Link href="/login">
              <button className="spatial-button ghost sm">Sign In</button>
            </Link>
          </div>

          {/* Mobile menu */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--material-regular-bg)] backdrop-blur-xl border-t border-[var(--material-thin-border)] p-4 space-y-3">
            <a href="#marketplace" onClick={() => setMobileMenuOpen(false)} className="block text-sm">Marketplace</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm">Features</a>
            <a href="#verification" onClick={() => setMobileMenuOpen(false)} className="block text-sm">Verification</a>
            <a href="#reputation" onClick={() => setMobileMenuOpen(false)} className="block text-sm">Reputation</a>
            <div className="flex gap-2 pt-2">
              <Link href={hero.link} className="flex-1"><button className="spatial-button primary sm w-full">{hero.cta}</button></Link>
              <Link href="/login" className="flex-1"><button className="spatial-button outline sm w-full">Sign In</button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═════════════════════════════════════════════════════════════════
          2. HERO — Animated Typographic Reveal
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <StaggerChildren>
            {/* Eyebrow */}
            <StaggerItem>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--terra-bg)] border border-[var(--terra)]/20 mb-6">
                <Sparkles className="size-3.5 text-[var(--terra)]" />
                <span className="text-xs font-medium text-[var(--terra)] uppercase tracking-widest">{content.hero.trustLine1}</span>
              </div>
            </StaggerItem>

            {/* Headline — word by word reveal */}
            <StaggerItem>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-4" style={{ fontFamily: "var(--font-clash)" }}>
                <span className="text-[var(--text-primary)]">{hero.headline}</span>{" "}
                <span className="bg-gradient-to-r from-[var(--terra)] to-[var(--terra-light)] bg-clip-text text-transparent italic">{hero.gradientText}</span>
              </h1>
            </StaggerItem>

            {/* Subheadline */}
            <StaggerItem>
              <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 leading-relaxed">
                {hero.sub}
              </p>
            </StaggerItem>

            {/* CTAs */}
            <StaggerItem>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link href={hero.link}>
                  <button className="spatial-button primary lg">
                    {hero.cta}
                    <ArrowRight className="size-4 ml-2" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="spatial-button outline lg">Sign In</button>
                </Link>
              </div>
            </StaggerItem>

            {/* Trust pills */}
            <StaggerItem>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { icon: ShieldCheck, text: content.hero.trustLine1 },
                  { icon: Lock, text: content.hero.trustLine2 },
                  { icon: BadgeCheck, text: content.hero.trustLine3 },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--material-thin-bg)] border border-[var(--material-thin-border)]">
                    <t.icon className="size-3.5 text-[var(--primary)]" />
                    <span className="text-xs text-[var(--text-secondary)]">{t.text}</span>
                  </div>
                ))}
              </div>
            </StaggerItem>
          </StaggerChildren>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          3. STATS BAND — CountUp Animation
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 overflow-hidden" style={{ background: "linear-gradient(135deg, #1E3A26 0%, #2D5A3D 50%, #1E3A26 100%)" }}>
        {/* Blurred orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--terra)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[var(--primary-vivid)]/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {content.marketplaceStats?.map((stat, i) => {
              const Icon = [Database, Stethoscope, Shield, Briefcase][i] || Star;
              return (
                <FadeInOnScroll key={i} delay={i * 0.1}>
                  <div className="text-center">
                    <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="size-5 text-white" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-clash)" }}>
                      {stat.countUpTo > 0 ? (
                        <CountUp value={stat.countUpTo} suffix={stat.suffix} duration={2} />
                      ) : stat.value}
                    </div>
                    <p className="text-sm text-white/70">{stat.label}</p>
                  </div>
                </FadeInOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          4. MARKETPLACE FLOW — Interactive How It Works
      ══════════════════════════════════════════════════════════════════ */}
      <section id="marketplace" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInOnScroll>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-12 bg-[var(--terra)]" />
                <span className="text-xs font-semibold text-[var(--terra)] uppercase tracking-widest">How It Works</span>
                <div className="h-px w-12 bg-[var(--terra)]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-clash)" }}>
                From Job Post to Placement
              </h2>
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                The complete marketplace flow — from posting a job to calculating payouts. Every step is transparent, auditable, and automated.
              </p>
            </div>
          </FadeInOnScroll>

          <StaggerChildren>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.marketplaceFlow?.map((step, i) => {
                const Icon = ICON_MAP[step.icon] || Briefcase;
                return (
                  <StaggerItem key={i}>
                    <TiltCard className="h-full">
                      <div className="spatial-card p-6 h-full">
                        <div className="flex items-center justify-between mb-4">
                          <div className="size-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center">
                            <Icon className="size-5 text-white" />
                          </div>
                          <span className="text-3xl font-bold text-[var(--primary)]/10" style={{ fontFamily: "var(--font-clash)" }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <h3 className="font-semibold text-[var(--text-primary)] mb-2">{step.title}</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
                      </div>
                    </TiltCard>
                  </StaggerItem>
                );
              })}
            </div>
          </StaggerChildren>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          5. FEATURE GRID — 6 Core Capabilities
      ══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 relative" style={{ background: "var(--material-thin-bg)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <FadeInOnScroll>
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-12 bg-[var(--terra)]" />
                <span className="text-xs font-semibold text-[var(--terra)] uppercase tracking-widest">Core Capabilities</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-clash)" }}>
                Everything you need to <span className="bg-gradient-to-r from-[var(--terra)] to-[var(--terra-light)] bg-clip-text text-transparent italic">source, verify, and place</span>
              </h2>
            </div>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.marketplaceFeatures?.map((feature, i) => {
              const Icon = ICON_MAP[feature.icon] || Briefcase;
              const isEven = i % 2 === 0;
              return (
                <FadeInOnScroll key={i} delay={(i % 3) * 0.1}>
                  <div className={`spatial-card p-6 h-full hover:-translate-y-1 transition-all duration-300`}>
                    <div className={`size-12 rounded-xl flex items-center justify-center mb-4 ${
                      isEven ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)]" : "bg-gradient-to-br from-[var(--terra)] to-[var(--terra-light)]"
                    }`}>
                      <Icon className="size-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[var(--terra)]" style={{ fontFamily: "var(--font-clash)" }}>{String(i + 1).padStart(2, "0")}</span>
                      <div className="h-px flex-1 bg-[var(--terra)]/20" />
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">{feature.heading}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.body}</p>
                  </div>
                </FadeInOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          6. TRUST & VERIFICATION — Checklist + Credentials + VaultSign
      ══════════════════════════════════════════════════════════════════ */}
      <section id="verification" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInOnScroll>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-12 bg-[var(--terra)]" />
                <span className="text-xs font-semibold text-[var(--terra)] uppercase tracking-widest">Trust & Verification</span>
                <div className="h-px w-12 bg-[var(--terra)]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-clash)" }}>
                Verified. Compliant. Auditable.
              </h2>
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                Every credential, checklist, and signature is verified, stored with full audit trail, and ready to share.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.verificationSection?.map((item, i) => {
              const Icon = ICON_MAP[item.icon] || CheckCircle2;
              return (
                <FadeInOnScroll key={i} delay={i * 0.15}>
                  <div className="spatial-card p-6 h-full">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center mb-4">
                      <Icon className="size-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">{item.heading}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{item.body}</p>
                    <ul className="space-y-1.5">
                      {item.features?.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <CheckCircle2 className="size-3.5 text-[var(--primary)] mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeInOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          7. REPUTATION SYSTEM — Public Profiles + Reviews
      ══════════════════════════════════════════════════════════════════ */}
      <section id="reputation" className="py-20 relative" style={{ background: "var(--material-thin-bg)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <FadeInOnScroll>
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-12 bg-[var(--terra)]" />
                <span className="text-xs font-semibold text-[var(--terra)] uppercase tracking-widest">Reputation System</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-clash)" }}>
                {content.reputationPreview?.headline || "Reputation You Can Trust"}
              </h2>
              <p className="text-lg text-[var(--text-secondary)] mb-6 leading-relaxed">
                {content.reputationPreview?.subheadline || "Every recruiter is rated by the candidates and employers they work with."}
              </p>
              <div className="space-y-3">
                {[
                  "5-dimensional reviews (1-10 scale)",
                  "Verified placement badges",
                  "Recruiter replies + dispute mechanism",
                  "Public profiles at /r/[recruiter-name]",
                  "Auto-suspension on upheld violations",
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[var(--primary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">{t}</span>
                  </div>
                ))}
              </div>
            </FadeInOnScroll>

            {/* Right: Mock profile card */}
            <FadeInOnScroll delay={0.2}>
              <ScaleIn>
                <div className="spatial-card p-6 max-w-md mx-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white text-xl font-bold">R</div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">Ravi Sharma</p>
                      <p className="text-xs text-[var(--text-secondary)]">Healthcare Recruiter · 47 reviews</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1,2,3,4].map((s) => <Star key={s} className="size-3 text-amber-400 fill-amber-400" />)}
                        <Star className="size-3 text-gray-300" />
                        <span className="text-xs font-semibold ml-1 text-[var(--text-primary)]">8.4/10</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {content.reputationPreview?.scoreDimensions?.map((dim, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--text-secondary)]">{dim.label}</span>
                          <span className="font-semibold text-[var(--text-primary)]">{dim.score.toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              dim.score >= 8 ? "bg-emerald-500" : dim.score >= 6 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${(dim.score / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[var(--material-thin-border)] flex items-center gap-2">
                    <BadgeCheck className="size-4 text-[var(--primary)]" />
                    <span className="text-xs font-medium text-[var(--primary)]">{content.reputationPreview?.badgeText || "Verified Recruiter"}</span>
                  </div>
                </div>
              </ScaleIn>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          8. DUAL CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E3A26 0%, #2D5A3D 50%, #1E3A26 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--terra)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[var(--primary-vivid)]/10 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <FadeInOnScroll>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-clash)" }}>
              Pick your side. <span className="bg-gradient-to-r from-[var(--terra)] to-[var(--terra-light)] bg-clip-text text-transparent italic">Start free.</span>
            </h2>
            <p className="text-lg text-white/70 mb-8">No credit card. No catch on the tools. Start in about a minute.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <button className="spatial-button lg" style={{ background: "var(--primary)", color: "white" }}>
                  I'm a Candidate <ArrowRight className="size-4 ml-2" />
                </button>
              </Link>
              <Link href="/agency-signup">
                <button className="spatial-button lg" style={{ background: "var(--terra)", color: "white" }}>
                  I'm a Recruiter <ArrowRight className="size-4 ml-2" />
                </button>
              </Link>
            </div>
            <p className="text-xs text-white/50 mt-4">No credit card required · Free during launch · HIPAA compliant</p>
          </FadeInOnScroll>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          9. FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="py-12" style={{ background: "#1E3A26" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand + Social */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold" style={{ fontFamily: "var(--font-clash)" }}>M</div>
                <span className="text-white font-semibold" style={{ fontFamily: "var(--font-clash)" }}>MyZipVault</span>
              </div>
              <p className="text-sm text-white/60 mb-4">The global healthcare recruiter identity and intelligence layer.</p>
              <div className="flex items-center gap-3">
                {socialLinks.linkedinUrl && (
                  <a href={socialLinks.linkedinUrl} target="_blank" rel="noopener" className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <span className="text-white text-xs font-bold">in</span>
                  </a>
                )}
                {socialLinks.facebookUrl && (
                  <a href={socialLinks.facebookUrl} target="_blank" rel="noopener" className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <span className="text-white text-xs font-bold">f</span>
                  </a>
                )}
                {socialLinks.whatsappNumber && (
                  <a href={`https://wa.me/${socialLinks.whatsappNumber}`} target="_blank" rel="noopener" className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Phone className="size-3.5 text-white" />
                  </a>
                )}
              </div>
            </div>

            {/* Platform links */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Platform</p>
              <ul className="space-y-2">
                <li><a href="#marketplace" className="text-sm text-white/70 hover:text-white transition-colors">Marketplace</a></li>
                <li><a href="#features" className="text-sm text-white/70 hover:text-white transition-colors">Features</a></li>
                <li><a href="#verification" className="text-sm text-white/70 hover:text-white transition-colors">Verification</a></li>
                <li><a href="#reputation" className="text-sm text-white/70 hover:text-white transition-colors">Reputation</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Company</p>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-white/70 hover:text-white transition-colors">About</Link></li>
                <li><Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/signup" className="text-sm text-white/70 hover:text-white transition-colors">Candidate Sign Up</Link></li>
                <li><Link href="/agency-signup" className="text-sm text-white/70 hover:text-white transition-colors">Recruiter Sign Up</Link></li>
              </ul>
            </div>

            {/* Trust */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Trust</p>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-sm text-white/70 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li className="text-sm text-white/50 flex items-center gap-1"><ShieldCheck className="size-3" /> {content.footer.hipaaBadgeText}</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/50">{content.footer.copyrightText}</p>
            <p className="text-xs text-white/30">Marketplace Phase 7 · Patent pending · USPTO #64/048,063</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
