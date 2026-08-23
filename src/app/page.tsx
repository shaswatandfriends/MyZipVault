"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu, X, ChevronDown, ShieldCheck, Briefcase, Users, HelpCircle,
  FileSignature, CreditCard, Mail, ArrowRight, Building2,
  Search, Database, Send, Lock, Star, CheckCircle2, Clock, Bell,
  Stethoscope, Upload, FileText, Calendar, TrendingUp, Award,
  Zap, Eye, FolderOpen, BadgeCheck, Handshake, Sparkles, Phone,
  UserPlus, DollarSign, MapPin, Globe,
} from "@/lib/icons";
import {
  menuSections,
  candidateFeatures,
  recruiterFeatures,
  employerFeatures,
  flowSteps,
  verificationItems,
  comparisonRows,
  faqSections,
  testimonials,
} from "@/lib/landing-content";

// ─── White / Blue / Black Palette ────────────────────────────────────────
const C = {
  primary: "#0A66C2",
  primaryDark: "#004182",
  primaryLight: "#70B5F9",
  primaryTint: "#EAF3FB",
  black: "#111827",
  white: "#FFFFFF",
  surface: "#F9FAFB",
  surfaceDark: "#0B162A",
  muted: "#6B7280",
  border: "#E5E7EB",
  shadowLg: "0 10px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03)",
  shadowSm: "0 2px 8px rgba(0,0,0,0.04)",
  radius: "12px",
  radiusLg: "20px",
  transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
};

// ─── Hamburger Menu — see src/lib/landing-content.ts (single source of truth) ──

// ─── All content (candidateFeatures, recruiterFeatures, employerFeatures, flowSteps,
//     verificationItems, comparisonRows, faqSections, testimonials) is imported from
//     src/lib/landing-content.ts — the single source of truth shared with /for-candidates,
//     /for-recruiters, /for-employers, /marketplace-flow, /credit-system, /faq, /support.

// ─── Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"candidate" | "recruiter" | "employer">("candidate");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onResize();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);

  const activeFeatures = viewTab === "candidate" ? candidateFeatures : viewTab === "recruiter" ? recruiterFeatures : employerFeatures;
  const signupLink = viewTab === "candidate" ? "/signup" : viewTab === "recruiter" ? "/agency-signup" : "/employer-signup";
  const ctaLabel = viewTab === "candidate" ? "I'm a Candidate" : viewTab === "recruiter" ? "I'm a Recruiter" : "I'm an Employer";

  return (
    <div style={{ minHeight: "100vh", background: C.white, fontFamily: "'Inter', -apple-system, sans-serif", color: C.black }}>
      {/* ═══ HEADER ═══ */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: C.white, borderBottom: scrolled ? `1px solid ${C.border}` : "none", boxShadow: scrolled ? C.shadowSm : "none", transition: C.transition }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 19, boxShadow: "0 2px 8px rgba(10,102,194,0.25)" }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 19, color: C.black }}>MyZipVault</span>
        </Link>
        <nav style={{ display: isDesktop ? "flex" : "none", alignItems: "center", gap: 32 }}>
          {[
            { label: "For Candidates", href: "/for-candidates" },
            { label: "For Recruiters", href: "/for-recruiters" },
            { label: "For Employers", href: "/for-employers" },
            { label: "How It Works", href: "/marketplace-flow" },
            { label: "FAQ", href: "/faq" },
          ].map((item, i) => (
            <Link key={i} href={item.href} style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>{item.label}</Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: C.primary, background: "transparent", border: "none", cursor: "pointer", borderRadius: 8 }}>Sign In</button>
          </Link>
          <Link href={signupLink} style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{ padding: "9px 22px", fontSize: 14, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 24, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(10,102,194,0.25)" }}>Get Started <ArrowRight size={14} /></button>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: menuOpen ? C.primaryTint : C.surface, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>
            {menuOpen ? <X size={20} style={{ color: C.primary }} /> : <Menu size={20} style={{ color: C.black }} />}
          </button>
        </div>
      </header>

      {/* Hamburger dropdown */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(17,24,39,0.3)", backdropFilter: "blur(2px)", zIndex: 48 }} />
          <div style={{ position: "fixed", top: 76, right: 24, width: 360, maxHeight: "85vh", overflowY: "auto", background: C.white, borderRadius: C.radiusLg, boxShadow: C.shadowLg, border: `1px solid ${C.border}`, zIndex: 49, padding: 8 }}>
            {menuSections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < menuSections.length - 1 ? 4 : 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "12px 16px 6px" }}>{section.title}</p>
                {section.items.map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", fontSize: 14, color: C.black, textDecoration: "none", borderRadius: 10 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryTint; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <item.icon size={16} style={{ color: C.primary }} />
                    </div>
                    {item.label}
                  </a>
                ))}
                {si < menuSections.length - 1 && <div style={{ height: 1, background: C.border, margin: "8px 16px" }} />}
              </div>
            ))}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
              {[{ label: "in", color: C.primary }, { label: "f", color: C.primary }, { label: "wa", color: "#25D366" }].map(s => (
                <a key={s.label} href="#" style={{ width: 40, height: 40, borderRadius: 10, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: s.color, textDecoration: "none", border: `1px solid ${C.border}` }}>{s.label}</a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ HERO ═══ */}
      <section style={{ paddingTop: 130, paddingBottom: 80, background: `linear-gradient(160deg, ${C.primaryDark} 0%, ${C.surfaceDark} 100%)`, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, right: -50, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.primary}30 0%, transparent 70%)`, filter: "blur(40px)" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: isDesktop ? "1.2fr 0.8fr" : "1fr", gap: 48, alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 24, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", marginBottom: 28 }}>
              <Sparkles size={14} style={{ color: C.primaryLight }} />
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Healthcare Recruiting, Reimagined</span>
            </div>
            <h1 style={{ fontSize: isDesktop ? 56 : 36, fontWeight: 800, lineHeight: 1.08, marginBottom: 24, letterSpacing: "-0.02em" }}>
              Recruiters work for <span style={{ color: C.primaryLight }}>themselves</span>, employers <span style={{ color: C.primaryLight }}>post directly</span>.
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", lineHeight: 1.65, marginBottom: 36, maxWidth: 560 }}>
              The first platform where healthcare recruiters keep 70% of every placement fee, employers post jobs with their own commission budget, and candidates own their data. No agency. No retainer.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
              <Link href="/signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(10,102,194,0.4)" }}>I'm a Candidate <ArrowRight size={16} /></button></Link>
              <Link href="/agency-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", borderRadius: 28 }}>I'm a Recruiter</button></Link>
              <Link href="/employer-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", borderRadius: 28 }}>I'm an Employer</button></Link>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {["HIPAA-Aligned", "BAA Available", "VaultSign E-Signature"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} style={{ color: C.primaryLight }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 300, background: "rgba(255,255,255,0.06)", borderRadius: C.radiusLg, padding: 28, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Platform Stats</p>
              {[{ v: "155+", l: "Skill checklist combinations" }, { v: "4", l: "Professions covered" }].map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 36, fontWeight: 800, color: C.white, lineHeight: 1 }}>{s.v}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{s.l}</p>
                </div>
              ))}
              <p style={{ fontSize: 18, fontWeight: 700, color: C.primaryLight, marginTop: 8 }}>Verify Once.<br/>Share Anywhere.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", marginTop: 12 }}>
                <ShieldCheck size={16} style={{ color: C.primaryLight }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>HIPAA-aligned & BAA ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section style={{ background: C.surface, padding: "48px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 24 }}>
          {[{ v: "155+", l: "Skill Checklist Combinations" }, { v: "4", l: "Professions Covered" }, { v: "100%", l: "Free for Candidates" }, { v: "70/30", l: "Recruiter / Platform Split" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 36, fontWeight: 800, color: C.primary, marginBottom: 4 }}>{s.v}</p>
              <p style={{ fontSize: 14, color: C.muted }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TABBED FEATURES (Candidate / Recruiter / Employer) ═══ */}
      <section id="features" style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          {/* 3-way tab toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", borderRadius: 28, background: C.surface, padding: 4, border: `1px solid ${C.border}` }}>
              {(["candidate", "recruiter", "employer"] as const).map((tab) => (
                <button key={tab} onClick={() => setViewTab(tab)} style={{
                  padding: "10px 24px", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", borderRadius: 24,
                  background: viewTab === tab ? C.primary : "transparent", color: viewTab === tab ? C.white : C.muted,
                  transition: C.transition,
                }}>
                  {tab === "candidate" ? "For Candidates" : tab === "recruiter" ? "For Recruiters" : "For Employers"}
                </button>
              ))}
            </div>
          </div>

          {/* Feature cards */}
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 16 }}>
            {activeFeatures.map((f, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 20, transition: C.transition }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.shadowMd; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <f.icon size={20} style={{ color: C.primary }} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.black, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MARKETPLACE FLOW ═══ */}
      <section id="marketplace" style={{ padding: "96px 0", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>How It Works</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10 }}>From Job Post to Placement</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr", gap: 32 }}>
            {flowSteps.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: C.white, boxShadow: "0 4px 16px rgba(10,102,194,0.2)" }}>
                  <s.icon size={32} />
                </div>
                <p style={{ fontSize: 32, fontWeight: 800, color: `${C.primary}25`, marginBottom: 8 }}>{String(i + 1).padStart(2, "0")}</p>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.black, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST & VERIFICATION ═══ */}
      <section id="verification" style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Trust & Verification</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10 }}>Verified. Compliant. Auditable.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {verificationItems.map((v, i) => (
              <div key={i} style={{ background: C.white, borderRadius: C.radiusLg, padding: 32, border: `1px solid ${C.border}`, boxShadow: C.shadowSm }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <v.icon size={26} style={{ color: C.primary }} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: C.black, marginBottom: 10 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, marginBottom: 20 }}>{v.desc}</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {v.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <CheckCircle2 size={18} style={{ color: C.primary, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: C.muted }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON TABLE ═══ */}
      <section style={{ padding: "96px 0", background: C.surface }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Comparison</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10 }}>MyZipVault vs Traditional Agency vs LinkedIn</h2>
          </div>
          <div style={{ overflowX: "auto", borderRadius: C.radiusLg, border: `1px solid ${C.border}`, boxShadow: C.shadowSm }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, background: C.white }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "20px 16px", borderBottom: `2px solid ${C.primary}`, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "20px 16px", borderBottom: `2px solid ${C.primary}`, fontSize: 15, fontWeight: 800, color: C.primary, background: C.primaryTint }}>MyZipVault</th>
                  <th style={{ textAlign: "center", padding: "20px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, color: C.muted }}>Traditional Agency</th>
                  <th style={{ textAlign: "center", padding: "20px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, color: C.muted }}>LinkedIn Recruiter</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "16px", fontWeight: 600, color: C.black }}>{row.feature}</td>
                    <td style={{ padding: "16px", textAlign: "center", background: C.primaryTint, color: C.primary, fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckCircle2 size={16} />{row.mzv}</div>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", color: C.muted }}>{row.agency}</td>
                    <td style={{ padding: "16px", textAlign: "center", color: C.muted }}>{row.linkedin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pricing</span>
          <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, marginBottom: 56 }}>Simple. Transparent. No surprises.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 24 }}>
            <div style={{ background: C.white, borderRadius: C.radiusLg, padding: 40, border: `2px solid ${C.primary}`, boxShadow: C.shadowMd }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Candidates</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: C.black, marginBottom: 4 }}>Free</p>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Forever. No credit card.</p>
              <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                {["Browse and apply to jobs", "AI Resume Builder (Tedo)", "Skills checklists", "Credential vault", "Reference network", "VaultSign e-signature"].map((t, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <CheckCircle2 size={18} style={{ color: C.primary }} /><span style={{ fontSize: 14, color: C.black }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: C.white, borderRadius: C.radiusLg, padding: 40, border: `2px solid ${C.border}`, boxShadow: C.shadowSm }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Recruiters & Employers</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: C.black, marginBottom: 4 }}>70/30</p>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Recruiters keep 70%. Employers set the budget.</p>
              <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                {["Search candidate pool", "Bring your own candidates", "90-day exclusive ownership", "Credit-gated contact reveal", "Employers post jobs directly", "First-submission-wins protection"].map((t, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <CheckCircle2 size={18} style={{ color: C.muted }} /><span style={{ fontSize: 14, color: C.black }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Q&A ═══ */}
      <section id="faq" style={{ padding: "96px 0", background: C.surface }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>FAQ</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10 }}>Questions, Answered.</h2>
          </div>
          {faqSections.map((section, si) => (
            <div key={si} style={{ marginBottom: 36 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>{section.category}</h3>
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isOpen = openFaq === key;
                return (
                  <div key={key} style={{ marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : key)} style={{ width: "100%", textAlign: "left", padding: "18px 22px", background: isOpen ? C.surface : "transparent", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, fontWeight: 600, color: C.black }}>
                      {item.q}
                      <ChevronDown size={18} style={{ color: C.muted, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s ease", flexShrink: 0 }} />
                    </button>
                    {isOpen && <div style={{ padding: "0 22px 18px", fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{item.a}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Testimonials</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10 }}>What users say</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: C.white, borderRadius: C.radiusLg, padding: 32, border: `1px solid ${C.border}`, boxShadow: C.shadowSm }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={18} style={{ color: "#FBBF24", fill: "#FBBF24" }} />)}
                </div>
                <p style={{ fontSize: 15, color: C.black, lineHeight: 1.65, marginBottom: 24 }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.white, fontSize: 17 }}>{t.name[0]}</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: C.black }}>{t.name}</p>
                    <p style={{ fontSize: 13, color: C.muted }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "96px 0", background: `linear-gradient(160deg, ${C.primaryDark} 0%, ${C.surfaceDark} 100%)`, color: C.white, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, left: "30%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.primary}20 0%, transparent 70%)`, filter: "blur(50px)" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 32px", position: "relative" }}>
          <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, marginBottom: 20 }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 36 }}>No credit card. No catch. Start in about a minute.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(10,102,194,0.4)" }}>I'm a Candidate <ArrowRight size={16} /></button></Link>
            <Link href="/agency-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", borderRadius: 28 }}>I'm a Recruiter</button></Link>
            <Link href="/employer-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", borderRadius: 28 }}>I'm an Employer</button></Link>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 20 }}>No credit card required · HIPAA compliant · Free during launch</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: C.surfaceDark, color: "rgba(255,255,255,0.65)", padding: "64px 0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "2fr 1fr 1fr 1fr 1.5fr" : "1fr 1fr", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 16 }}>M</div>
                <span style={{ fontWeight: 700, fontSize: 17, color: C.white }}>MyZipVault</span>
              </div>
              <p style={{ fontSize: 14, marginBottom: 20 }}>The healthcare recruiter identity and intelligence layer.</p>
              <div style={{ display: "flex", gap: 10 }}>
                {["in", "f", "wa"].map(s => (
                  <a key={s} href="#" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>{s}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Platform</p>
              {[
                { label: "Marketplace", href: "/marketplace-flow" },
                { label: "Credit System", href: "/credit-system" },
                { label: "For Candidates", href: "/for-candidates" },
                { label: "For Recruiters", href: "/for-recruiters" },
              ].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", marginBottom: 10 }}>{t.label}</Link>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Company</p>
              {[
                { label: "About", href: "/about" },
                { label: "Our Story", href: "/our-story" },
                { label: "Contact", href: "/contact" },
                { label: "Referral Program", href: "/referral-program" },
                { label: "Sign Up", href: "/signup" },
                { label: "For Employers", href: "/for-employers" },
              ].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", marginBottom: 10 }}>{t.label}</Link>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Legal</p>
              {[
                { label: "Terms", href: "/terms" },
                { label: "Privacy", href: "/privacy" },
                { label: "FAQ", href: "/faq" },
                { label: "Support", href: "/support" },
              ].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", marginBottom: 10 }}>{t.label}</Link>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Newsletter</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>Get product updates.</p>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="email" placeholder="your@email.com" style={{ flex: 1, padding: "10px 14px", fontSize: 13, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: C.white, outline: "none" }} />
                <button style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.white, background: C.primary, border: "none", borderRadius: 8, cursor: "pointer" }}>→</button>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>© 2026 MyZipVault. All rights reserved.</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Patent pending · USPTO #64/048,063</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
