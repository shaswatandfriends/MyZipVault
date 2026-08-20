"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu, X, ChevronDown, ShieldCheck, Briefcase, Users, HelpCircle,
  FileSignature, CreditCard, Mail, ArrowRight, Building2, Globe,
  Search, Database, Send, Lock, Star, CheckCircle2, Clock, Bell,
  Stethoscope, Upload, FileText, Calendar, TrendingUp, Award,
  Zap, Eye, FolderOpen, BadgeCheck, Handshake, Sparkles, Phone,
} from "@/lib/icons";

// ─── White / Blue / Black Palette ────────────────────────────────────────
const C = {
  primary: "#0A66C2",       // LinkedIn blue
  primaryDark: "#004182",   // Deep navy
  primaryLight: "#70B5F9",  // Light blue
  primaryTint: "#EAF3FB",   // Very light blue tint
  black: "#111827",         // Near-black text
  white: "#FFFFFF",
  surface: "#F9FAFB",       // Very light gray (softer than #F3F2F0)
  surfaceDark: "#0B162A",   // Near-black navy for dark sections
  muted: "#6B7280",         // Gray for secondary text
  border: "#E5E7EB",        // Light border
  shadowLg: "0 10px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03)",
  shadowSm: "0 2px 8px rgba(0,0,0,0.04)",
  radius: "12px",
  radiusLg: "20px",
  transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
};

// ─── Hamburger Menu with icons ───────────────────────────────────────────
const menuSections = [
  { title: "ABOUT", items: [
    { icon: Building2, label: "What is MyZipVault?", href: "#about" },
    { icon: Users, label: "Our Story", href: "#story" },
    { icon: Mail, label: "Contact", href: "#contact" },
    { icon: Handshake, label: "Referral Program", href: "#referral" },
  ]},
  { title: "HOW IT WORKS", items: [
    { icon: Briefcase, label: "For Candidates", href: "#for-candidates" },
    { icon: Search, label: "For Recruiters", href: "#for-recruiters" },
    { icon: Send, label: "Marketplace Flow", href: "#marketplace" },
    { icon: CreditCard, label: "Credit System", href: "#credits" },
  ]},
  { title: "HELP", items: [
    { icon: HelpCircle, label: "FAQ", href: "#faq" },
    { icon: Phone, label: "Support", href: "#support" },
    { icon: Lock, label: "Privacy Policy", href: "/privacy" },
    { icon: FileText, label: "Terms of Service", href: "/terms" },
  ]},
];

// ─── Data arrays (same content as before) ───────────────────────────────
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

const recruiterFeatures = [
  { icon: Briefcase, title: "Browse Open Jobs", desc: "See all open positions with commission info. Pick the jobs worth your time." },
  { icon: Search, title: "Search Candidate Pool", desc: "Search by name, email, phone, specialty, location. Path A — use platform data." },
  { icon: Users, title: "Bring Your Own", desc: "Path B — add candidates from your network. 90-day exclusive ownership if both email + phone are new." },
  { icon: FileSignature, title: "Send RTR via VaultSign", desc: "Send Right to Represent. Candidate e-signs. No RTR = no submission. Full consent layer." },
  { icon: CreditCard, title: "Credit-Gated Reveal", desc: "Pay credits to unlock email + phone. 90-day reveal validity. Costs configurable." },
  { icon: Send, title: "Submit Candidates", desc: "First-submission-wins (millisecond timestamp + reputation tiebreak). One candidate → one job = one recruiter." },
  { icon: ShieldCheck, title: "Ownership Windows", desc: "0-90 days: exclusive (75/25). 90-180: residual (68/30/2). 180+: open (70/30)." },
  { icon: FolderOpen, title: "Book of Business", desc: "Drag-drop pipeline. Kanban + list views. Candidate pools. Lead tracking. Pipeline reports." },
  { icon: Calendar, title: "Calendar & Scheduling", desc: "Availability scheduling. Shift requests. Daily call sheets. Auto-match candidates to shifts." },
  { icon: BadgeCheck, title: "Compliance Bundles", desc: "Pre-package checklist + credentials + references + resume. One request gets everything." },
  { icon: Eye, title: "Real-Time Tracking", desc: "See who opened your request, who's at 30% or 90%, who submitted. No more guessing." },
  { icon: Star, title: "Recruiter Reputation", desc: "Public profile at /r/[your-name]. Reviews from candidates. Verified badges." },
  { icon: CreditCard, title: "Credit Purchase", desc: "Buy credits via Stripe. Platform admin can also allocate credits." },
  { icon: Bell, title: "Smart Notifications", desc: "Real-time alerts for submission status changes, new job postings, candidate responses." },
];

const flowSteps = [
  { icon: Briefcase, title: "Post a Job", desc: "Platform creates job postings with commission info. Set public for candidate self-apply or private for recruiters." },
  { icon: Search, title: "Find Candidates", desc: "Recruiters search the healthcare pool (Path A) or bring their own (Path B with 90-day exclusive ownership)." },
  { icon: FileSignature, title: "Send RTR", desc: "Recruiter sends Right to Represent via VaultSign. Candidate e-signs. No RTR, no submission." },
  { icon: Send, title: "Submit & Win", desc: "First submission wins (millisecond timestamp). Ownership: 90-day exclusive (75/25), then residual (68/30/2)." },
];

const verificationItems = [
  { icon: CheckCircle2, title: "Skills Checklists", desc: "Industry-standard healthcare checklists. Complete once, reuse for 30 days.", features: ["Complete once, share for 30 days", "Industry-standard templates", "PDF export with your name", "Reminders before expiry"] },
  { icon: ShieldCheck, title: "Credential Management", desc: "Upload BLS, ACLS, RN License, immunizations. Admin verification + expiry reminders.", features: ["Admin-verified credentials", "Automatic expiry reminders", "Secure storage with audit trail", "One-click share with recruiters"] },
  { icon: FileSignature, title: "VaultSign E-Signature", desc: "Full e-signature platform: templates, multi-signer, audit trails, PDF export.", features: ["Multi-signer sequential/parallel", "Full audit trail with IP + device", "PDF export with signature data", "Auto-expiry + reminders"] },
];

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

const faqSections = [
  { category: "General", items: [
    { q: "What is MyZipVault?", a: "A healthcare recruiting marketplace where candidates own their data, recruiters work independently (not for a company), and every placement is monitored and protected." },
    { q: "Is this free?", a: "100% free for candidates. Recruiters pay nothing upfront — 70/30 split on placements only." },
    { q: "Do recruiters need to work for a company?", a: "No. Recruiters work independently. They keep 70% of placement fees. No agency overhead, no retainer. You build your own brand." },
    { q: "What makes this different from LinkedIn or Indeed?", a: "We own healthcare candidate records. Recruiters get 90-day exclusive ownership when they bring new candidates. Every placement has legal protection." },
  ]},
  { category: "VaultSign", items: [
    { q: "What is VaultSign?", a: "Our built-in e-signature platform. Used for Right to Represent (RTR), offer letters, and any document requiring signature." },
    { q: "Do I need to print and scan documents?", a: "No. Everything is digital. Sign on any device. Full audit trail with IP + device info." },
    { q: "Is VaultSign legally binding?", a: "Yes. Each signature includes timestamp, IP address, device info, and document hash (SHA-256). Full audit trail stored permanently." },
    { q: "Can multiple people sign the same document?", a: "Yes. Sequential (one after another) or parallel (all at once) signing orders supported." },
  ]},
  { category: "Marketplace & Ownership", items: [
    { q: "What is the 90-day ownership window?", a: "When a recruiter brings a new candidate (Path B), they get 90 days of exclusive access. No other recruiter can see or submit that candidate. Split: 75/25." },
    { q: "What happens after 90 days?", a: "Days 90-180: 'residual' phase. Other recruiters can submit, but the original owner gets 2% from the new recruiter's 70%. Split: 68/30/2." },
    { q: "What about after 180 days?", a: "Standard 70/30 split. No residual. Anyone can submit." },
    { q: "What if two recruiters submit the same candidate?", a: "First submission wins (millisecond timestamp). If tied, reputation score breaks the tie. If still tied, split 35/35/30." },
    { q: "What is Path A vs Path B?", a: "Path A: search and submit from our candidate pool (no ownership). Path B: bring your own candidate (90-day exclusive ownership if email + phone are both new)." },
  ]},
  { category: "Credits", items: [
    { q: "How do credits work?", a: "Recruiters buy credits via Stripe. Credits are spent to reveal contact info, submit candidates, send checklists. Each action's cost is configurable." },
    { q: "How much do credits cost?", a: "Default: 2 credits to reveal email, 2 for phone, 2 to submit, 2 to send checklist. Platform admin can change these anytime." },
    { q: "Do candidates need credits?", a: "No. Credits are recruiter-side only. Candidates are 100% free." },
  ]},
  { category: "Checklists & Verification", items: [
    { q: "How do skills checklists work?", a: "When a recruiter requests a checklist, the candidate completes it once. Stored for 30 days. If another recruiter requests the same checklist, just click Share — no retake." },
    { q: "What credentials can I upload?", a: "BLS, ACLS, RN License, immunization records, and any other healthcare credential. Admin-verified. Expiry reminders 30 days before renewal." },
    { q: "Can recruiters see my credentials without permission?", a: "No. Recruiters only see what you explicitly share via expiring access links (7/14/30 days). You can revoke access anytime." },
  ]},
  { category: "Privacy & Security", items: [
    { q: "Is my data HIPAA compliant?", a: "We are HIPAA-aligned. BAA available for organizations. 256-bit encryption at rest. Full audit trail on every action." },
    { q: "Who owns my data?", a: "You do. If you delete your account, all recruiter access is killed instantly. Your data is purged." },
  ]},
  { category: "Jobs & Applications", items: [
    { q: "Can candidates apply to jobs directly?", a: "Yes. Public jobs are browsable. Candidates apply without a recruiter. 100% of the placement fee goes to the platform." },
    { q: "What commission structure is used?", a: "Either a flat fee (e.g., $5,000) or a percentage of salary (e.g., 15%). Set per job by the platform." },
  ]},
];

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

  return (
    <div style={{ minHeight: "100vh", background: C.white, fontFamily: "'Inter', -apple-system, sans-serif", color: C.black }}>
      {/* ═══ HEADER ═══ */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px",
        background: scrolled ? C.white : C.white,
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        boxShadow: scrolled ? C.shadowSm : "none",
        transition: C.transition,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 19, boxShadow: "0 2px 8px rgba(10,102,194,0.25)" }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 19, color: C.black }}>MyZipVault</span>
        </Link>
        <nav style={{ display: isDesktop ? "flex" : "none", alignItems: "center", gap: 32 }}>
          {["For Candidates", "For Recruiters", "How It Works", "FAQ"].map((label, i) => (
            <a key={i} href={`#${label.toLowerCase().replace(/\s+/g, "-")}`} style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500, transition: "color 0.15s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
            >{label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: C.primary, background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, transition: C.transition }}>Sign In</button>
          </Link>
          <Link href="/signup" style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{ padding: "9px 22px", fontSize: 14, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 24, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(10,102,194,0.25)", transition: C.transition }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryDark; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = "none"; }}
            >Get Started <ArrowRight size={14} /></button>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            background: menuOpen ? C.primaryTint : C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, cursor: "pointer", transition: C.transition,
          }}>
            {menuOpen ? <X size={20} style={{ color: C.primary }} /> : <Menu size={20} style={{ color: C.black }} />}
          </button>
        </div>
      </header>

      {/* Hamburger dropdown — polished */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(17,24,39,0.3)", backdropFilter: "blur(2px)", zIndex: 48 }} />
          <div style={{
            position: "fixed", top: 76, right: 24, width: 360, maxHeight: "85vh", overflowY: "auto",
            background: C.white, borderRadius: C.radiusLg, boxShadow: C.shadowLg,
            border: `1px solid ${C.border}`, zIndex: 49, padding: 8,
          }}>
            {menuSections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < menuSections.length - 1 ? 4 : 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "12px 16px 6px" }}>{section.title}</p>
                {section.items.map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    fontSize: 14, color: C.black, textDecoration: "none", borderRadius: 10,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryTint; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <item.icon size={16} style={{ color: C.primary }} />
                    </div>
                    {item.label}
                  </a>
                ))}
                {si < menuSections.length - 1 && <div style={{ height: 1, background: C.border, margin: "8px 16px" }} />}
              </div>
            ))}
            {/* Social */}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
              {[{ label: "in", color: C.primary }, { label: "f", color: C.primary }, { label: "wa", color: "#25D366" }].map(s => (
                <a key={s.label} href="#" style={{ width: 40, height: 40, borderRadius: 10, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: s.color, textDecoration: "none", border: `1px solid ${C.border}`, transition: C.transition }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = C.shadowSm; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >{s.label}</a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ HERO ═══ */}
      <section style={{ paddingTop: 130, paddingBottom: 80, background: `linear-gradient(160deg, ${C.primaryDark} 0%, ${C.surfaceDark} 100%)`, color: C.white, position: "relative", overflow: "hidden" }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -100, right: -50, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.primary}30 0%, transparent 70%)`, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -50, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.primaryLight}20 0%, transparent 70%)`, filter: "blur(40px)" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: isDesktop ? "1.2fr 0.8fr" : "1fr", gap: 48, alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 24, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", marginBottom: 28 }}>
              <Sparkles size={14} style={{ color: C.primaryLight }} />
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Healthcare Recruiting, Reimagined</span>
            </div>
            <h1 style={{ fontSize: isDesktop ? 56 : 36, fontWeight: 800, lineHeight: 1.08, marginBottom: 24, letterSpacing: "-0.02em" }}>
              Recruiters work for <span style={{ color: C.primaryLight }}>themselves</span>, not for agencies.
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", lineHeight: 1.65, marginBottom: 36, maxWidth: 560 }}>
              The first platform where healthcare recruiters keep 70% of every placement fee, own their candidates for 90 days, and build a public verified reputation. No agency. No retainer. No overhead.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
              <Link href="/signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(10,102,194,0.4)", transition: C.transition }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(10,102,194,0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(10,102,194,0.4)"; }}
              >I'm a Candidate <ArrowRight size={16} /></button></Link>
              <Link href="/agency-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", borderRadius: 28, transition: C.transition }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              >I'm a Recruiter</button></Link>
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
          {/* Stats card */}
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

      {/* ═══ FOR CANDIDATES ═══ */}
      <section id="for-candidates" style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>For Candidates</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, letterSpacing: "-0.02em" }}>Everything you need, <span style={{ color: C.primary }}>nothing you don't.</span></h2>
            <p style={{ fontSize: 16, color: C.muted, marginTop: 14, maxWidth: 640, margin: "14px auto 0", lineHeight: 1.6 }}>Your credentials, checklists, references, and resume — all in one vault. Share on your terms. Take it anywhere.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 20 }}>
            {candidateFeatures.map((f, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 24, transition: C.transition }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.shadowMd; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = C.primaryTint; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <f.icon size={22} style={{ color: C.primary }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ YOUR CAREER, YOUR DATA ═══ */}
      <section style={{ padding: "96px 0", background: `linear-gradient(160deg, ${C.surfaceDark} 0%, ${C.primaryDark} 100%)`, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -40, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.primary}20 0%, transparent 70%)`, filter: "blur(50px)" }} />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px", textAlign: "center", position: "relative" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <ShieldCheck size={32} style={{ color: C.primaryLight }} />
          </div>
          <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>Your Career, Your Data.</h2>
          <p style={{ fontSize: 20, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 40 }}>
            You own everything. Not the recruiter. Not the agency. Not us.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(2, 1fr)" : "1fr", gap: 16, textAlign: "left" }}>
            {["Your vault stays with you when you leave a recruiter", "Your checklists stay with you — complete once, reuse 30 days", "Your references stay with you — verified and portable", "Your credentials stay with you — admin-verified, expiry-tracked"].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 20, background: "rgba(255,255,255,0.05)", borderRadius: C.radius, border: "1px solid rgba(255,255,255,0.08)" }}>
                <CheckCircle2 size={22} style={{ color: C.primaryLight, marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }}>{t}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 26, fontWeight: 700, color: C.primaryLight, marginTop: 36 }}>Build once. Take it anywhere.</p>
        </div>
      </section>

      {/* ═══ FOR RECRUITERS ═══ */}
      <section id="for-recruiters" style={{ padding: "96px 0", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>For Recruiters</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, letterSpacing: "-0.02em" }}>Work for yourself. <span style={{ color: C.primary }}>Keep 70%.</span></h2>
            <p style={{ fontSize: 16, color: C.muted, marginTop: 14, maxWidth: 640, margin: "14px auto 0", lineHeight: 1.6 }}>No agency. No retainer. No overhead. Search our candidate pool, bring your own, send RTR, submit, and earn.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 20 }}>
            {recruiterFeatures.map((f, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 24, transition: C.transition }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.shadowMd; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <f.icon size={22} style={{ color: C.primary }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MARKETPLACE FLOW ═══ */}
      <section id="marketplace" style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>How It Works</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, letterSpacing: "-0.02em" }}>From Job Post to Placement</h2>
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
      <section id="verification" style={{ padding: "96px 0", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Trust & Verification</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, letterSpacing: "-0.02em" }}>Verified. Compliant. Auditable.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {verificationItems.map((v, i) => (
              <div key={i} style={{ background: C.white, borderRadius: C.radiusLg, padding: 32, border: `1px solid ${C.border}`, boxShadow: C.shadowSm, transition: C.transition }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.shadowLg; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = C.shadowSm; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: C.primaryTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <v.icon size={26} style={{ color: C.primary }} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: C.black, marginBottom: 10 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, marginBottom: 20 }}>{v.desc}</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {v.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <CheckCircle2 size={18} style={{ color: C.primary, marginTop: 1, flexShrink: 0 }} />
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
      <section style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Comparison</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, letterSpacing: "-0.02em" }}>MyZipVault vs Traditional Agency vs LinkedIn</h2>
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
      <section id="pricing" style={{ padding: "96px 0", background: C.surface }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pricing</span>
          <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, marginBottom: 56, letterSpacing: "-0.02em" }}>Simple. Transparent. No surprises.</h2>
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
              <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Recruiters</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: C.black, marginBottom: 4 }}>70/30</p>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>You keep 70%. We keep 30%.</p>
              <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                {["Search candidate pool", "Bring your own candidates", "90-day exclusive ownership", "Credit-gated contact reveal", "Public reputation profile", "First-submission-wins protection"].map((t, i) => (
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
      <section id="faq" style={{ padding: "96px 0", background: C.white }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>FAQ</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, letterSpacing: "-0.02em" }}>Questions, Answered.</h2>
          </div>
          {faqSections.map((section, si) => (
            <div key={si} style={{ marginBottom: 36 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>{section.category}</h3>
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isOpen = openFaq === key;
                return (
                  <div key={key} style={{ marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: "hidden", transition: C.transition }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : key)} style={{ width: "100%", textAlign: "left", padding: "18px 22px", background: isOpen ? C.surface : "transparent", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, fontWeight: 600, color: C.black, transition: "background 0.15s ease" }}>
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
      <section style={{ padding: "96px 0", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Testimonials</span>
            <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.black, marginTop: 10, letterSpacing: "-0.02em" }}>What users say</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: C.white, borderRadius: C.radiusLg, padding: 32, border: `1px solid ${C.border}`, boxShadow: C.shadowSm, transition: C.transition }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.shadowLg; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = C.shadowSm; e.currentTarget.style.transform = "none"; }}
              >
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
          <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 36 }}>No credit card. No catch on the tools. Start in about a minute.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: C.primary, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(10,102,194,0.4)", transition: C.transition }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
            >I'm a Candidate <ArrowRight size={16} /></button></Link>
            <Link href="/agency-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", borderRadius: 28, transition: C.transition }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            >I'm a Recruiter</button></Link>
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
              <p style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>The healthcare recruiter identity and intelligence layer.</p>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ label: "in", href: "#" }, { label: "f", href: "#" }, { label: "wa", href: "#" }].map(s => (
                  <a key={s.label} href={s.href} style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", transition: C.transition }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "none"; }}
                  >{s.label}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Platform</p>
              {["Marketplace", "Features", "Verification", "Reputation"].map(t => <a key={t} href="#" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", marginBottom: 10, transition: "color 0.15s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.white; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              >{t}</a>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Company</p>
              {["About", "Contact", "Careers", "Blog"].map(t => <a key={t} href="#" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", marginBottom: 10 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.white; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              >{t}</a>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Legal</p>
              {["Terms", "Privacy", "HIPAA", "BAA"].map(t => <a key={t} href="#" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", marginBottom: 10 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.white; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              >{t}</a>)}
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
