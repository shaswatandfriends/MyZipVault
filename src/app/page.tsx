"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu, X, ChevronDown, ShieldCheck, Briefcase, Users, HelpCircle,
  FileSignature, CreditCard, Mail, ArrowRight, Building2, Globe,
  Search, Database, Send, Lock, Star, CheckCircle2, Clock, Bell,
  Stethoscope, Upload, FileText, Calendar, TrendingUp, Award,
  Zap, Eye, FolderOpen, BadgeCheck, Handshake, Sparkles,
} from "@/lib/icons";

// ─── Glass Warm Palette (original) ─────────────────────────────────────
const C = {
  darkNavy: "#1E3A26",      // dark forest green (replaces dark navy)
  midNavy: "#2D5A3D",       // forest green (replaces mid navy)
  primary: "#2D5A3D",       // forest green primary
  primaryLight: "#4A7C59", // lighter green
  primaryTint: "rgba(45,90,61,0.12)", // green tint
  white: "#FFFFFF",
  surface: "#F2EDE4",      // warm off-white
  text: "#2D5A3D",         // dark green text
  muted: "#6A8A6A",        // muted green
  amber: "#C97B54",        // terracotta accent (replaces amber)
};

// ─── Hamburger Menu ──────────────────────────────────────────────────────
const menuSections = [
  { title: "ABOUT", items: [
    { label: "What is MyZipVault?", href: "#about" },
    { label: "Our Story", href: "#story" },
    { label: "Contact", href: "#contact" },
    { label: "Referral Program", href: "#referral" },
  ]},
  { title: "HOW IT WORKS", items: [
    { label: "For Candidates", href: "#for-candidates" },
    { label: "For Recruiters", href: "#for-recruiters" },
    { label: "Marketplace Flow", href: "#marketplace" },
    { label: "Credit System", href: "#credits" },
  ]},
  { title: "HELP", items: [
    { label: "FAQ", href: "#faq" },
    { label: "Support", href: "#support" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ]},
];

// ─── Candidate Features ─────────────────────────────────────────────────
const candidateFeatures = [
  { icon: Briefcase, title: "Browse & Apply to Jobs", desc: "Indeed-style job board. See salary, specialty, location. Apply directly — no recruiter needed. 100% free." },
  { icon: Sparkles, title: "AI Resume Builder (Tedo)", desc: "Conversational AI assistant builds your resume. ATS scoring, optimization, PDF export. 3 versions." },
  { icon: CheckCircle2, title: "Skills Checklists", desc: "Complete industry-standard checklists once. Reuse for 30 days. No retakes. PDF export with your name." },
  { icon: ShieldCheck, title: "Credential Vault", desc: "Upload BLS, ACLS, RN License, immunizations. Admin-verified. Expiry reminders 30 days before renewal." },
  { icon: Users, title: "Reference Network", desc: "Connect with managers. They verify and sign references via VaultSign. Stored permanently — ready to share." },
  { icon: FileSignature, title: "VaultSign E-Signature", desc: "Sign RTR documents, offer letters, and more. Full audit trail. No more printing + scanning." },
  { icon: Calendar, title: "Calendar & Scheduling", desc: "Set availability. Receive shift requests. Share calendar links with recruiters. Daily call sheets." },
  { icon: Lock, title: "Sharing Controls", desc: "Grant expiring access (7/14/30 days). Revoke anytime. Recruiters see ONLY what you allow. Nothing more." },
  { icon: Database, title: "Profile Auto-Link", desc: "If your email matches our healthcare pool, your profile is auto-filled — specialty, location, etc." },
  { icon: Star, title: "Rate Recruiters", desc: "Leave 5-dimensional reviews (professionalism, communication, job match, speed, post-placement). Public on profiles." },
  { icon: ShieldCheck, title: "Report Recruiters", desc: "File formal complaints for misrepresentation, harassment, RTR violations. Auto-suspension on upheld reports." },
  { icon: Bell, title: "Smart Notifications", desc: "Real-time alerts for job matches, checklist requests, document views, credential expiry warnings." },
];

// ─── Recruiter Features ─────────────────────────────────────────────────
const recruiterFeatures = [
  { icon: Briefcase, title: "Browse Open Jobs", desc: "See all open positions with commission info (flat fee or % of salary). Pick the jobs worth your time." },
  { icon: Search, title: "Search Candidate Pool", desc: "Search by name, email, phone, specialty, location. Path A — use platform data." },
  { icon: Users, title: "Bring Your Own Candidates", desc: "Path B — add candidates from your network. 90-day exclusive ownership if email + phone are both new." },
  { icon: FileSignature, title: "Send RTR via VaultSign", desc: "Send Right to Represent. Candidate e-signs. No RTR = no submission. Full consent layer." },
  { icon: CreditCard, title: "Credit-Gated Reveal", desc: "Pay credits to unlock email + phone. 90-day reveal validity. Costs configurable by platform admin." },
  { icon: Send, title: "Submit Candidates", desc: "First-submission-wins (millisecond timestamp + reputation tiebreak). One candidate → one job = one recruiter." },
  { icon: ShieldCheck, title: "Ownership Windows", desc: "0-90 days: exclusive (75/25). 90-180: residual (68/30/2 — you get 2%). 180+: open (70/30)." },
  { icon: FolderOpen, title: "Book of Business (BOB)", desc: "Drag-drop pipeline. Kanban + list views. Candidate pools. Lead tracking. Pipeline reports." },
  { icon: Calendar, title: "Calendar & Scheduling", desc: "Availability scheduling. Shift requests. Daily call sheets. Auto-match candidates to shifts." },
  { icon: BadgeCheck, title: "Compliance Bundles", desc: "Pre-package checklist + credentials + references + resume. One request gets everything." },
  { icon: Eye, title: "Real-Time Tracking", desc: "See who opened your request, who's at 30% or 90%, who submitted. No more guessing or follow-up emails." },
  { icon: Star, title: "Recruiter Reputation", desc: "Public profile at /r/[your-name]. Reviews from candidates. Verified badges (25+ reviews, 7+ avg)." },
  { icon: CreditCard, title: "Credit Purchase", desc: "Buy credits via Stripe. Platform admin can also allocate credits. Per-task costs configurable." },
  { icon: Bell, title: "Smart Notifications", desc: "Real-time alerts for submission status changes, new job postings, candidate responses." },
];

// ─── Marketplace Flow ───────────────────────────────────────────────────
const flowSteps = [
  { icon: Briefcase, title: "Post a Job", desc: "Platform creates job postings with commission info. Set public for candidate self-apply or private for recruiters." },
  { icon: Search, title: "Find Candidates", desc: "Recruiters search the healthcare pool (Path A) or bring their own (Path B with 90-day exclusive ownership)." },
  { icon: FileSignature, title: "Send RTR", desc: "Recruiter sends Right to Represent via VaultSign. Candidate e-signs. No RTR, no submission." },
  { icon: Send, title: "Submit & Win", desc: "First submission wins (millisecond timestamp). Ownership: 90-day exclusive (75/25), then residual (68/30/2)." },
];

// ─── Verification Items ─────────────────────────────────────────────────
const verificationItems = [
  { icon: CheckCircle2, title: "Skills Checklists", desc: "Industry-standard healthcare checklists. Complete once, reuse for 30 days.", features: ["Complete once, share for 30 days", "Industry-standard templates", "PDF export with your name", "Reminders before expiry"] },
  { icon: ShieldCheck, title: "Credential Management", desc: "Upload BLS, ACLS, RN License, immunizations. Admin verification + expiry reminders.", features: ["Admin-verified credentials", "Automatic expiry reminders", "Secure storage with audit trail", "One-click share with recruiters"] },
  { icon: FileSignature, title: "VaultSign E-Signature", desc: "Full e-signature platform: templates, multi-signer, audit trails, PDF export.", features: ["Multi-signer sequential/parallel", "Full audit trail with IP + device", "PDF export with signature data", "Auto-expiry + reminders"] },
];

// ─── Comparison Table ───────────────────────────────────────────────────
const comparisonRows = [
  { feature: "Cost to candidate", mzv: "100% Free", agency: "Free", linkedin: "Free" },
  { feature: "Candidate data ownership", mzv: "Candidate owns everything", agency: "Agency owns the data", linkedin: "LinkedIn owns the data" },
  { feature: "Checklist reuse", mzv: "Complete once, reuse 30 days", agency: "Retake every time", linkedin: "No checklists" },
  { feature: "Reference portability", mzv: "Verified references follow candidate", agency: "References stay with agency", linkedin: "No reference system" },
  { feature: "Document signing", mzv: "VaultSign e-signature built-in", agency: "Print, sign, scan, email", linkedin: "No signing" },
  { feature: "Independent operation", mzv: "Recruiters work for themselves", agency: "Recruiters work for agency", linkedin: "Recruiters need company account" },
  { feature: "Placement protection", mzv: "90-day ownership + circumvention detection", agency: "Varies by contract", linkedin: "None" },
  { feature: "Credential verification", mzv: "Admin-verified + expiry tracking", agency: "Manual verification", linkedin: "Self-reported only" },
];

// ─── Q&A Items ──────────────────────────────────────────────────────────
const faqSections = [
  {
    category: "General",
    items: [
      { q: "What is MyZipVault?", a: "A healthcare recruiting marketplace where candidates own their data, recruiters work independently (not for a company), and every placement is monitored and protected." },
      { q: "Is this free?", a: "100% free for candidates. Recruiters pay nothing upfront — 70/30 split on placements only." },
      { q: "Do recruiters need to work for a company?", a: "No. Recruiters work independently. They keep 70% of placement fees. No agency overhead, no retainer. You build your own brand." },
      { q: "What makes this different from LinkedIn or Indeed?", a: "We own healthcare candidate records. Recruiters get 90-day exclusive ownership when they bring new candidates. Every placement has legal protection (circumvention detection + liquidated damages)." },
    ],
  },
  {
    category: "VaultSign",
    items: [
      { q: "What is VaultSign?", a: "Our built-in e-signature platform. Used for Right to Represent (RTR), offer letters, and any document requiring signature." },
      { q: "Do I need to print and scan documents?", a: "No. Everything is digital. Sign on any device. Full audit trail with IP + device info." },
      { q: "Is VaultSign legally binding?", a: "Yes. Each signature includes timestamp, IP address, device info, and document hash (SHA-256). Full audit trail stored permanently." },
      { q: "Can multiple people sign the same document?", a: "Yes. Sequential (one after another) or parallel (all at once) signing orders supported." },
    ],
  },
  {
    category: "Marketplace & Ownership",
    items: [
      { q: "What is the 90-day ownership window?", a: "When a recruiter brings a new candidate (Path B), they get 90 days of exclusive access. No other recruiter can see or submit that candidate. Split: 75/25 (recruiter/platform)." },
      { q: "What happens after 90 days?", a: "Days 90-180: 'residual' phase. Other recruiters can submit, but the original owner gets 2% from the new recruiter's 70%. Split: 68/30/2." },
      { q: "What about after 180 days?", a: "Standard 70/30 split. No residual. Anyone can submit." },
      { q: "What if two recruiters submit the same candidate?", a: "First submission wins (millisecond timestamp). If tied, reputation score breaks the tie. If still tied, split 35/35/30." },
      { q: "What is Path A vs Path B?", a: "Path A: search and submit from our candidate pool (no ownership). Path B: bring your own candidate (90-day exclusive ownership if email + phone are both new)." },
    ],
  },
  {
    category: "Credits",
    items: [
      { q: "How do credits work?", a: "Recruiters buy credits via Stripe. Credits are spent to reveal contact info, submit candidates, send checklists. Each action's cost is configurable." },
      { q: "How much do credits cost?", a: "Default: 2 credits to reveal email, 2 for phone, 2 to submit, 2 to send checklist. Platform admin can change these anytime." },
      { q: "Do candidates need credits?", a: "No. Credits are recruiter-side only. Candidates are 100% free." },
      { q: "What happens if I run out of credits?", a: "You can't reveal contact info or submit candidates until you purchase more. Platform admin can also allocate credits to your organization." },
    ],
  },
  {
    category: "Checklists & Verification",
    items: [
      { q: "How do skills checklists work?", a: "When a recruiter requests a checklist, the candidate completes it once. Stored for 30 days. If another recruiter requests the same checklist, just click Share — no retake." },
      { q: "What credentials can I upload?", a: "BLS, ACLS, RN License, immunization records, and any other healthcare credential. Admin-verified. Expiry reminders 30 days before renewal." },
      { q: "Can recruiters see my credentials without permission?", a: "No. Recruiters only see what you explicitly share via expiring access links (7/14/30 days). You can revoke access anytime." },
    ],
  },
  {
    category: "Privacy & Security",
    items: [
      { q: "Is my data HIPAA compliant?", a: "We are HIPAA-aligned. BAA available for organizations. 256-bit encryption at rest. Full audit trail on every action." },
      { q: "Who owns my data?", a: "You do. If you delete your account, all recruiter access is killed instantly. Your data is purged." },
      { q: "Can recruiters download my information?", a: "They can only view what you share during the access window. After expiry, they see nothing. No bulk export without consent." },
    ],
  },
  {
    category: "Jobs & Applications",
    items: [
      { q: "Can candidates apply to jobs directly?", a: "Yes. Public jobs are browsable. Candidates apply without a recruiter. 100% of the placement fee goes to the platform." },
      { q: "Who posts the jobs?", a: "The platform posts jobs. Recruiters browse and submit candidates to these jobs." },
      { q: "What commission structure is used?", a: "Either a flat fee (e.g., $5,000) or a percentage of salary (e.g., 15%). Set per job by the platform." },
    ],
  },
];

// ─── Testimonials ───────────────────────────────────────────────────────
const testimonials = [
  { name: "Sarah K.", role: "ICU RN, Travel Nurse", text: "I completed my skills checklist once and shared it with three different agencies. No retakes. No redundancy. This saved me hours." },
  { name: "Marcus T.", role: "Healthcare Recruiter, Independent", text: "I work for myself now. 70% of every placement fee goes to me. No agency taking 60% off the top. The 90-day ownership protection is real." },
  { name: "Dr. Patel", role: "Locum Hospitalist", text: "VaultSign eliminated the print-sign-scan-email cycle. I signed my RTR on my phone in 30 seconds. Full audit trail. No more lost documents." },
];

// ─── Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onResize();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);

  const toggleFaq = (key: string) => setOpenFaq(openFaq === key ? null : key);

  return (
    <div style={{ minHeight: "100vh", background: C.white, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ═══ HEADER ═══ */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: scrolled ? C.white : "transparent", borderBottom: scrolled ? `1px solid ${C.surface}` : "none", transition: "all 0.3s ease", boxShadow: scrolled ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.darkNavy} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 700, fontSize: 18 }}>M</div>
          <span style={{ fontWeight: 600, fontSize: 18, color: C.text }}>MyZipVault</span>
        </Link>
        <nav style={{ display: isDesktop ? "flex" : "none", alignItems: "center", gap: 28 }}>
          <a href="#for-candidates" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>For Candidates</a>
          <a href="#for-recruiters" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>For Recruiters</a>
          <a href="#marketplace" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>How It Works</a>
          <a href="#faq" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>FAQ</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: C.primary, background: "transparent", border: "none", cursor: "pointer", borderRadius: 6 }}>Sign In</button>
          </Link>
          <Link href="/signup" style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{ padding: "8px 20px", fontSize: 14, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 24, display: "flex", alignItems: "center", gap: 6 }}>Get Started <ArrowRight size={14} /></button>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: menuOpen ? C.primaryTint : "transparent", border: `1px solid ${menuOpen ? C.primary : C.surface}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s ease" }}>
            {menuOpen ? <X size={20} style={{ color: C.primary }} /> : <Menu size={20} style={{ color: C.text }} />}
          </button>
        </div>
      </header>

      {/* Hamburger dropdown */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.15)", zIndex: 48 }} />
          <div style={{ position: "fixed", top: 72, right: 24, width: 320, maxHeight: "80vh", overflowY: "auto", background: C.white, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.12)", border: `1px solid ${C.surface}`, zIndex: 49, padding: 16 }}>
            {menuSections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < menuSections.length - 1 ? 16 : 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 8 }}>{section.title}</p>
                {section.items.map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 14, color: C.text, textDecoration: "none", borderRadius: 6 }}>
                    <ChevronDown size={14} style={{ color: C.muted, transform: "rotate(-90deg)" }} />{item.label}
                  </a>
                ))}
                {si < menuSections.length - 1 && <div style={{ height: 1, background: C.surface, margin: "12px 0" }} />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ HERO ═══ */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: `linear-gradient(135deg, ${C.darkNavy} 0%, ${C.midNavy} 100%)`, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", marginBottom: 24 }}>
              <Sparkles size={14} style={{ color: C.primaryLight }} />
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Healthcare Recruiting, Reimagined</span>
            </div>
            <h1 style={{ fontSize: isDesktop ? 52 : 36, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
              Recruiters work for <span style={{ color: C.primaryLight }}>themselves</span>, not for agencies.
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 32 }}>
              The first platform where healthcare recruiters keep 70% of every placement fee, own their candidates for 90 days, and build a public verified reputation. No agency. No retainer. No overhead.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
              <Link href="/signup"><button style={{ padding: "14px 28px", fontSize: 16, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8 }}>I'm a Candidate <ArrowRight size={16} /></button></Link>
              <Link href="/agency-signup"><button style={{ padding: "14px 28px", fontSize: 16, fontWeight: 600, color: C.white, background: "transparent", border: `2px solid rgba(255,255,255,0.3)`, cursor: "pointer", borderRadius: 28 }}>I'm a Recruiter</button></Link>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {["HIPAA-Aligned", "BAA Available", "VaultSign E-Signature"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} style={{ color: C.primaryLight }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 280, background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(10px)" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Platform Stats</p>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: C.white }}>155+</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Skill checklist combinations</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: C.white }}>4</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Professions covered</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.primaryLight }}>Verify Once.<br/>Share Anywhere.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
                <ShieldCheck size={14} style={{ color: C.primaryLight }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>HIPAA-aligned & BAA ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section style={{ background: C.surface, padding: "40px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 24 }}>
          {[
            { value: "155+", label: "Skill Checklist Combinations" },
            { value: "4", label: "Professions Covered" },
            { value: "100%", label: "Free for Candidates" },
            { value: "70/30", label: "Recruiter / Platform Split" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: C.primary, marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 14, color: C.muted }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOR CANDIDATES ═══ */}
      <section id="for-candidates" style={{ padding: "80px 0", background: C.white }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>For Candidates</span>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8 }}>Everything you need, <span style={{ color: C.primary }}>nothing you don't.</span></h2>
            <p style={{ fontSize: 16, color: C.muted, marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>Your credentials, checklists, references, and resume — all in one vault. Share on your terms. Take it anywhere.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 16 }}>
            {candidateFeatures.map((f, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.surface}`, borderRadius: 12, padding: 20, transition: "all 0.2s ease" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <f.icon size={20} style={{ color: C.primary }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ YOUR CAREER, YOUR DATA ═══ */}
      <section style={{ padding: "80px 0", background: C.darkNavy, color: C.white }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <ShieldCheck size={48} style={{ color: C.primaryLight, marginBottom: 24 }} />
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, marginBottom: 16 }}>Your Career, Your Data.</h2>
          <p style={{ fontSize: 20, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 32 }}>
            You own everything. Not the recruiter. Not the agency. Not us.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(2, 1fr)" : "1fr", gap: 16, textAlign: "left" }}>
            {[
              "Your vault stays with you when you leave a recruiter",
              "Your checklists stay with you — complete once, reuse 30 days",
              "Your references stay with you — verified and portable",
              "Your credentials stay with you — admin-verified, expiry-tracked",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 16, background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
                <CheckCircle2 size={20} style={{ color: C.primaryLight, marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }}>{t}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 24, fontWeight: 700, color: C.primaryLight, marginTop: 32 }}>Build once. Take it anywhere.</p>
        </div>
      </section>

      {/* ═══ FOR RECRUITERS ═══ */}
      <section id="for-recruiters" style={{ padding: "80px 0", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em" }}>For Recruiters</span>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8 }}>Work for yourself. <span style={{ color: C.amber }}>Keep 70%.</span></h2>
            <p style={{ fontSize: 16, color: C.muted, marginTop: 12, maxWidth: 600, margin: "12px auto 0" }}>No agency. No retainer. No overhead. Search our candidate pool, bring your own, send RTR, submit, and earn.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 16 }}>
            {recruiterFeatures.map((f, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.surface}`, borderRadius: 12, padding: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.amber}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <f.icon size={20} style={{ color: C.amber }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MARKETPLACE FLOW ═══ */}
      <section id="marketplace" style={{ padding: "80px 0", background: C.white }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>How It Works</span>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8 }}>From Job Post to Placement</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr", gap: 24 }}>
            {flowSteps.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.darkNavy} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: C.white }}>
                  <s.icon size={28} />
                </div>
                <p style={{ fontSize: 32, fontWeight: 800, color: `${C.primary}30`, marginBottom: 8 }}>{String(i + 1).padStart(2, "0")}</p>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST & VERIFICATION ═══ */}
      <section id="verification" style={{ padding: "80px 0", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Trust & Verification</span>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8 }}>Verified. Compliant. Auditable.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {verificationItems.map((v, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 12, padding: 24, border: `1px solid ${C.surface}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <v.icon size={24} style={{ color: C.primary }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>{v.desc}</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {v.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <CheckCircle2 size={16} style={{ color: C.primary, marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: C.muted }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON TABLE ═══ */}
      <section style={{ padding: "80px 0", background: C.white }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Comparison</span>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8 }}>MyZipVault vs Traditional Agency vs LinkedIn</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "16px 12px", borderBottom: `2px solid ${C.primary}`, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "16px 12px", borderBottom: `2px solid ${C.primary}`, fontSize: 14, fontWeight: 800, color: C.primary }}>MyZipVault</th>
                  <th style={{ textAlign: "center", padding: "16px 12px", borderBottom: `2px solid ${C.surface}`, fontSize: 14, fontWeight: 600, color: C.muted }}>Traditional Agency</th>
                  <th style={{ textAlign: "center", padding: "16px 12px", borderBottom: `2px solid ${C.surface}`, fontSize: 14, fontWeight: 600, color: C.muted }}>LinkedIn Recruiter</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.surface}` }}>
                    <td style={{ padding: "14px 12px", fontWeight: 600, color: C.text }}>{row.feature}</td>
                    <td style={{ padding: "14px 12px", textAlign: "center", background: C.primaryTint, color: C.primary, fontWeight: 600, borderRadius: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><CheckCircle2 size={14} />{row.mzv}</div>
                    </td>
                    <td style={{ padding: "14px 12px", textAlign: "center", color: C.muted }}>{row.agency}</td>
                    <td style={{ padding: "14px 12px", textAlign: "center", color: C.muted }}>{row.linkedin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ padding: "80px 0", background: C.surface }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pricing</span>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8, marginBottom: 48 }}>Simple. Transparent. No surprises.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 24 }}>
            <div style={{ background: C.white, borderRadius: 16, padding: 32, border: `2px solid ${C.primary}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>For Candidates</p>
              <p style={{ fontSize: 48, fontWeight: 800, color: C.text, marginBottom: 4 }}>Free</p>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Forever. No credit card.</p>
              <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                {["Browse and apply to jobs", "AI Resume Builder (Tedo)", "Skills checklists", "Credential vault", "Reference network", "VaultSign e-signature"].map((t, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <CheckCircle2 size={16} style={{ color: C.primary }} /><span style={{ fontSize: 14, color: C.text }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: C.white, borderRadius: 16, padding: 32, border: `2px solid ${C.amber}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>For Recruiters</p>
              <p style={{ fontSize: 48, fontWeight: 800, color: C.text, marginBottom: 4 }}>70/30</p>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>You keep 70% of every placement. We keep 30%.</p>
              <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                {["Search candidate pool", "Bring your own candidates", "90-day exclusive ownership", "Credit-gated contact reveal", "Public reputation profile", "First-submission-wins protection"].map((t, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <CheckCircle2 size={16} style={{ color: C.amber }} /><span style={{ fontSize: 14, color: C.text }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Q&A ═══ */}
      <section id="faq" style={{ padding: "80px 0", background: C.white }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>FAQ</span>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8 }}>Questions, Answered.</h2>
          </div>
          {faqSections.map((section, si) => (
            <div key={si} style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.surface}` }}>{section.category}</h3>
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isOpen = openFaq === key;
                return (
                  <div key={key} style={{ marginBottom: 8, border: `1px solid ${C.surface}`, borderRadius: 8, overflow: "hidden" }}>
                    <button onClick={() => toggleFaq(key)} style={{ width: "100%", textAlign: "left", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, fontWeight: 600, color: C.text }}>
                      {item.q}
                      <ChevronDown size={16} style={{ color: C.muted, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", flexShrink: 0 }} />
                    </button>
                    {isOpen && <div style={{ padding: "0 20px 16px", fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{item.a}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={{ padding: "80px 0", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Testimonials</span>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginTop: 8 }}>What users say</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 12, padding: 28, border: `1px solid ${C.surface}` }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {[1,2,3,4,5].map((s) => <Star key={s} size={16} style={{ color: "#FBBF24", fill: "#FBBF24" }} />)}
                </div>
                <p style={{ fontSize: 15, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.primary, fontSize: 16 }}>{t.name[0]}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: C.muted }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "80px 0", background: `linear-gradient(135deg, ${C.darkNavy} 0%, ${C.midNavy} 100%)`, color: C.white, textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, marginBottom: 16 }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 32 }}>No credit card. No catch on the tools. Start in about a minute.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup"><button style={{ padding: "14px 28px", fontSize: 16, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8 }}>I'm a Candidate <ArrowRight size={16} /></button></Link>
            <Link href="/agency-signup"><button style={{ padding: "14px 28px", fontSize: 16, fontWeight: 600, color: C.white, background: "transparent", border: `2px solid rgba(255,255,255,0.3)`, cursor: "pointer", borderRadius: 28 }}>I'm a Recruiter</button></Link>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>No credit card required · HIPAA compliant · Free during launch</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: C.darkNavy, color: "rgba(255,255,255,0.7)", padding: "60px 0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "2fr 1fr 1fr 1fr 1fr" : "1fr 1fr", gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 700, fontSize: 14 }}>M</div>
                <span style={{ fontWeight: 600, fontSize: 16, color: C.white }}>MyZipVault</span>
              </div>
              <p style={{ fontSize: 14, marginBottom: 16 }}>The healthcare recruiter identity and intelligence layer.</p>
              <div style={{ display: "flex", gap: 8 }}>
                {["in", "f", "wa"].map((s) => (
                  <a key={s} href="#" style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>{s}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Platform</p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {["Marketplace", "Features", "Verification", "Reputation"].map(t => <li key={t} style={{ marginBottom: 8 }}><a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{t}</a></li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Company</p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {["About", "Contact", "Careers", "Blog"].map(t => <li key={t} style={{ marginBottom: 8 }}><a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{t}</a></li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Legal</p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {["Terms", "Privacy", "HIPAA", "BAA"].map(t => <li key={t} style={{ marginBottom: 8 }}><a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{t}</a></li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Newsletter</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Get product updates.</p>
              <div style={{ display: "flex", gap: 4 }}>
                <input type="email" placeholder="Email" style={{ flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: C.white }} />
                <button style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: C.white, background: C.primary, border: "none", borderRadius: 6, cursor: "pointer" }}>→</button>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>© 2026 MyZipVault. All rights reserved.</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Patent pending · USPTO #64/048,063</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
