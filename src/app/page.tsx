"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu, X, ArrowRight, Building2, Search, Send, CreditCard,
  ShieldCheck, Lock, Star, CheckCircle2, Briefcase, Users,
  FileSignature, Database, Bell, Calendar, FolderOpen, BadgeCheck,
  Handshake, Sparkles, Phone, HelpCircle, FileText, Mail,
  TrendingUp, Eye, UserCheck, DollarSign, Zap, Clock,
} from "@/lib/icons";
import {
  menuSections, candidateFeatures, recruiterFeatures, employerFeatures,
  flowSteps, verificationItems, comparisonRows, testimonials, statsBar,
} from "@/lib/landing-content";

// ═══════════════════════════════════════════════════════════════════
// DESIGN TOKENS — Dark Premium
// ═══════════════════════════════════════════════════════════════════
const C = {
  bg: "#0A0F1A",
  bgCard: "rgba(255,255,255,0.03)",
  bgCardHover: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(59,130,246,0.4)",
  text: "#F1F5F9",
  textMuted: "rgba(241,245,249,0.5)",
  textDim: "rgba(241,245,249,0.35)",
  primary: "#3B82F6",
  primaryGlow: "rgba(59,130,246,0.4)",
  accent: "#06B6D4",
  accentGlow: "rgba(6,182,212,0.3)",
  emerald: "#10B981",
  amber: "#F59E0B",
  violet: "#8B5CF6",
  white: "#FFFFFF",
};

// ═══════════════════════════════════════════════════════════════════
// ANIMATION HOOKS
// ═══════════════════════════════════════════════════════════════════

// Scroll reveal — fades + slides elements into view
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("sr-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// Counter animation — counts up from 0 to target when scrolled into view
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
            else setCount(target);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

// ═══════════════════════════════════════════════════════════════════
// ANIMATED GRADIENT MESH BACKGROUND
// ═══════════════════════════════════════════════════════════════════
function GradientMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Large slow-moving gradient orbs */}
      <div
        className="absolute rounded-full blur-[120px] opacity-20"
        style={{
          width: 600, height: 600, top: "-100px", left: "10%",
          background: `radial-gradient(circle, ${C.primary} 0%, transparent 70%)`,
          animation: "float-orb 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full blur-[100px] opacity-15"
        style={{
          width: 500, height: 500, top: "30%", right: "5%",
          background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`,
          animation: "float-orb 25s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute rounded-full blur-[120px] opacity-10"
        style={{
          width: 700, height: 700, bottom: "-200px", left: "30%",
          background: `radial-gradient(circle, ${C.violet} 0%, transparent 70%)`,
          animation: "float-orb 30s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GLASS CARD
// ═══════════════════════════════════════════════════════════════════
function GlassCard({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`rounded-2xl backdrop-blur-xl transition-all duration-300 ${className}`}
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        boxShadow: glow ? `0 0 40px ${C.primaryGlow}` : "0 4px 24px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FLOATING DASHBOARD MOCKUP (hero right side)
// ═══════════════════════════════════════════════════════════════════
function DashboardMockup() {
  return (
    <div
      className="relative"
      style={{ animation: "float-card 6s ease-in-out infinite" }}
    >
      {/* Glow behind mockup */}
      <div
        className="absolute inset-0 rounded-3xl blur-3xl"
        style={{ background: `linear-gradient(135deg, ${C.primaryGlow}, ${C.accentGlow})`, transform: "scale(1.1)" }}
      />

      {/* Browser frame */}
      <GlassCard glow className="overflow-hidden rounded-2xl" >
        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-400/60" />
            <div className="size-2.5 rounded-full bg-amber-400/60" />
            <div className="size-2.5 rounded-full bg-green-400/60" />
          </div>
          <div className="flex-1 mx-4">
            <div className="rounded-md px-3 py-1 text-[10px] text-center" style={{ background: "rgba(255,255,255,0.05)", color: C.textDim }}>
              🔒 myzipvault.com/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-5 space-y-4" style={{ minHeight: 380 }}>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Credentials", value: "12", icon: ShieldCheck, color: C.primary },
              { label: "Checklists", value: "3", icon: CheckCircle2, color: C.emerald },
              { label: "References", value: "5", icon: Users, color: C.accent },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}
              >
                <stat.icon className="size-4 mb-2" style={{ color: stat.color }} />
                <p className="text-lg font-bold" style={{ color: C.text }}>{stat.value}</p>
                <p className="text-[9px]" style={{ color: C.textMuted }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium" style={{ color: C.textMuted }}>Profile Completion</p>
              <p className="text-[10px] font-bold" style={{ color: C.primary }}>85%</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: "85%",
                  background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                  animation: "shimmer 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Activity items */}
          <div className="space-y-2">
            {[
              { icon: CheckCircle2, text: "BLS certificate verified", time: "2m ago", color: C.emerald },
              { icon: FileSignature, text: "RTR signed via VaultSign", time: "1h ago", color: C.primary },
              { icon: Bell, text: "New job match: ICU RN", time: "3h ago", color: C.accent },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg p-2.5"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: `${item.color}15` }}>
                  <item.icon className="size-3.5" style={{ color: item.color }} />
                </div>
                <p className="text-[10px] flex-1" style={{ color: C.text }}>{item.text}</p>
                <p className="text-[9px]" style={{ color: C.textDim }}>{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Floating badge */}
      <div
        className="absolute -top-4 -right-4 rounded-xl px-4 py-2"
        style={{
          background: `linear-gradient(135deg, ${C.emerald}, #059669)`,
          boxShadow: `0 8px 24px ${C.emerald}40`,
          animation: "float-card 4s ease-in-out infinite 0.5s",
        }}
      >
        <p className="text-xs font-bold text-white">✓ HIPAA Aligned</p>
      </div>

      {/* Floating credit card */}
      <div
        className="absolute -bottom-6 -left-6 rounded-xl px-4 py-3"
        style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
          boxShadow: `0 8px 24px ${C.primaryGlow}`,
          animation: "float-card 5s ease-in-out infinite 1s",
        }}
      >
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-white" />
          <div>
            <p className="text-[9px] text-white/70">Credits</p>
            <p className="text-sm font-bold text-white">84</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STAT COUNTER COMPONENT
// ═══════════════════════════════════════════════════════════════════
function StatCounter({ value, label }: { value: string; label: string }) {
  // Parse numeric value for counter animation
  const numMatch = value.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0]) : 0;
  const suffix = value.replace(/\d+/, "");
  const { count, ref } = useCounter(num);

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl md:text-4xl font-bold" style={{ color: C.text, fontFamily: "'Clash Display', sans-serif" }}>
        {count}{suffix}
      </p>
      <p className="text-xs mt-1" style={{ color: C.textMuted }}>{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FEATURE CARD (with floating hover effect)
// ═══════════════════════════════════════════════════════════════════
function FeatureCard({ icon: Icon, title, desc, color }: { icon: typeof Briefcase; title: string; desc: string; color: string }) {
  return (
    <div
      className="group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="flex size-10 items-center justify-center rounded-xl mb-3 transition-transform group-hover:scale-110"
        style={{
          background: `${color}15`,
          border: `1px solid ${color}30`,
        }}
      >
        <Icon className="size-5" style={{ color }} />
      </div>
      <h3 className="text-sm font-semibold mb-1.5" style={{ color: C.text }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{desc}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [viewTab, setViewTab] = useState<"candidate" | "recruiter" | "employer">("candidate");

  useScrollReveal();

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
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ═══ CSS ANIMATIONS ═══ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-orb { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.1); } 66% { transform: translate(-30px,20px) scale(0.95); } }
        @keyframes float-card { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes slide-in-right { from { opacity:0; transform: translateX(30px); } to { opacity:1; transform: translateX(0); } }
        @keyframes fade-up { from { opacity:0; transform: translateY(30px); } to { opacity:1; transform: translateY(0); } }
        .scroll-reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .sr-visible { opacity: 1 !important; transform: translateY(0) !important; }
        .tab-transition { animation: slide-in-right 0.4s ease forwards; }
        .hero-text { animation: fade-up 0.8s ease forwards; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}} />

      <GradientMesh />

      {/* ═══ HEADER ═══ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px",
          background: scrolled ? "rgba(10,15,26,0.8)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", zIndex: 51 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontWeight: 800, fontSize: 19,
            boxShadow: `0 4px 12px ${C.primaryGlow}`,
          }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 19, color: C.text }}>MyZipVault</span>
        </Link>

        <nav style={{ display: isDesktop ? "flex" : "none", alignItems: "center", gap: 28, zIndex: 51 }}>
          {[
            { label: "Browse Jobs", href: "/browse-jobs" },
            { label: "Blog", href: "/blog" },
            { label: "How It Works", href: "/marketplace-flow" },
            { label: "FAQ", href: "/faq" },
          ].map((item, i) => (
            <Link key={i} href={item.href} style={{ fontSize: 14, color: C.textMuted, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.text}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}
            >{item.label}</Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 51 }}>
          <Link href="/login" style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: C.text, background: "transparent", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 8, transition: "all 0.2s" }}>Sign In</button>
          </Link>
          <Link href={signupLink} style={{ display: isDesktop ? "inline" : "none" }}>
            <button style={{
              padding: "9px 22px", fontSize: 14, fontWeight: 600, color: C.white,
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              border: "none", cursor: "pointer", borderRadius: 24,
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: `0 4px 16px ${C.primaryGlow}`,
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >Get Started <ArrowRight size={14} /></button>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: menuOpen ? C.bgCard : "transparent", border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>
            {menuOpen ? <X size={20} style={{ color: C.text }} /> : <Menu size={20} style={{ color: C.text }} />}
          </button>
        </div>
      </header>

      {/* Hamburger dropdown */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 48 }} />
          <div style={{
            position: "fixed", top: 76, right: 24, width: 340, maxHeight: "85vh", overflowY: "auto",
            background: "rgba(10,15,26,0.95)", backdropFilter: "blur(24px)",
            borderRadius: 20, border: `1px solid ${C.border}`, zIndex: 49, padding: 8,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            {menuSections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < menuSections.length - 1 ? 4 : 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.15em", padding: "12px 16px 6px" }}>{section.title}</p>
                {section.items.map((item) => (
                  <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", fontSize: 14, color: C.text, textDecoration: "none", borderRadius: 10, transition: "background 0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <item.icon size={16} style={{ color: C.primary }} />
                    </div>
                    {item.label}
                  </Link>
                ))}
                {si < menuSections.length - 1 && <div style={{ height: 1, background: C.border, margin: "8px 16px" }} />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ HERO SECTION — Split Layout ═══ */}
      <section style={{ paddingTop: 120, paddingBottom: 80, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: isDesktop ? "1.1fr 0.9fr" : "1fr", gap: 48, alignItems: "center" }}>
          {/* Left: Headline + CTAs */}
          <div className="hero-text">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(59,130,246,0.1)", border: `1px solid ${C.primary}30`, marginBottom: 24 }}>
              <Sparkles className="size-3.5" style={{ color: C.accent }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>Healthcare Recruiting Marketplace</span>
            </div>

            <h1 style={{
              fontSize: isDesktop ? 52 : 36, fontWeight: 800, lineHeight: 1.1, marginBottom: 20,
              background: `linear-gradient(135deg, ${C.text} 0%, ${C.primary} 50%, ${C.accent} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontFamily: "'Clash Display', sans-serif",
            }}>
              Recruiters work for themselves, not for agencies.
            </h1>

            <p style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.6, marginBottom: 32, maxWidth: 500 }}>
              The first marketplace where healthcare professionals own their data, recruiters keep 70% of placement fees, and employers hire directly — no middleman markup.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
              <Link href="/signup">
                <button style={{
                  padding: "14px 28px", fontSize: 15, fontWeight: 600, color: C.white,
                  background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                  border: "none", cursor: "pointer", borderRadius: 28,
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: `0 8px 24px ${C.primaryGlow}`,
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >I'm a Candidate <ArrowRight size={16} /></button>
              </Link>
              <Link href="/agency-signup">
                <button style={{ padding: "14px 28px", fontSize: 15, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}
                >I'm a Recruiter</button>
              </Link>
              <Link href="/employer-signup">
                <button style={{ padding: "14px 28px", fontSize: 15, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}
                >I'm an Employer</button>
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {["HIPAA Aligned", "256-bit Encryption", "BAA Available"].map((t, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textDim }}>
                  <CheckCircle2 className="size-3.5" style={{ color: C.emerald }} /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Floating Dashboard Mockup */}
          <div style={{ position: "relative" }} className={isDesktop ? "" : "hidden"}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR — Counter Animation ═══ */}
      <section className="scroll-reveal" style={{ padding: "48px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 32 }}>
            {statsBar.map((stat, i) => (
              <StatCounter key={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROLE TAB TOGGLE — Animated Tabs ═══ */}
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginBottom: 12, fontFamily: "'Clash Display', sans-serif" }}>
              Built for all three sides.
            </h2>
            <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 600, margin: "0 auto" }}>
              Whether you're a healthcare professional, an independent recruiter, or a hiring employer — MyZipVault has you covered.
            </p>
          </div>

          {/* Tab Toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <div style={{
              display: "flex", gap: 4, padding: 4,
              background: "rgba(255,255,255,0.03)", borderRadius: 28,
              border: `1px solid ${C.border}`, backdropFilter: "blur(20px)",
            }}>
              {[
                { key: "candidate" as const, label: "For Candidates", icon: Users },
                { key: "recruiter" as const, label: "For Recruiters", icon: Search },
                { key: "employer" as const, label: "For Employers", icon: Building2 },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setViewTab(tab.key)}
                  style={{
                    padding: "10px 20px", fontSize: 13, fontWeight: 600,
                    borderRadius: 22, cursor: "pointer", transition: "all 0.3s",
                    display: "flex", alignItems: "center", gap: 6,
                    background: viewTab === tab.key ? `linear-gradient(135deg, ${C.primary}, ${C.accent})` : "transparent",
                    color: viewTab === tab.key ? C.white : C.textMuted,
                    border: "none",
                    boxShadow: viewTab === tab.key ? `0 4px 12px ${C.primaryGlow}` : "none",
                  }}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feature grid with slide transition */}
          <div key={viewTab} className="tab-transition" style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 20 }}>
            {activeFeatures.map((f) => {
              const colors = [C.primary, C.accent, C.emerald, C.amber, C.violet, C.primary];
              const color = colors[Math.floor(Math.random() * colors.length)];
              return <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} color={color} />;
            })}
          </div>

          {/* CTA per tab */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href={signupLink}>
              <button style={{
                padding: "14px 32px", fontSize: 15, fontWeight: 600, color: C.white,
                background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                border: "none", cursor: "pointer", borderRadius: 28,
                boxShadow: `0 8px 24px ${C.primaryGlow}`,
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >{ctaLabel} <ArrowRight size={16} style={{ display: "inline" }} /></button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ MARKETPLACE FLOW ═══ */}
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Marketplace Flow</span>
            <h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, fontFamily: "'Clash Display', sans-serif" }}>How it works — 4 steps.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr", gap: 24 }}>
            {flowSteps.map((step, i) => (
              <div key={i} style={{ position: "relative" }}>
                {/* Connecting line */}
                {i < flowSteps.length - 1 && (
                  <div style={{
                    position: "absolute", top: 28, left: "60%", right: "-40%",
                    height: 2, background: `linear-gradient(90deg, ${C.primary}40, transparent)`,
                    display: isDesktop ? "block" : "none",
                  }} />
                )}
                <div
                  className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                  style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: `linear-gradient(135deg, ${C.primary}20, ${C.accent}20)`,
                      border: `1px solid ${C.primary}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <step.icon size={22} style={{ color: C.primary }} />
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: C.textDim, fontFamily: "'Clash Display', sans-serif" }}>{i + 1}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST & VERIFICATION ═══ */}
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Trust & Verification</span>
            <h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, fontFamily: "'Clash Display', sans-serif" }}>Every credential, verified.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {verificationItems.map((v) => (
              <div key={v.title} className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1" style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <v.icon size={24} style={{ color: C.accent }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 10 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, marginBottom: 20 }}>{v.desc}</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {v.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <CheckCircle2 size={16} style={{ color: C.emerald, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 14, color: C.textMuted }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pricing</span>
          <h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, marginBottom: 56, fontFamily: "'Clash Display', sans-serif" }}>Simple. Transparent. No surprises.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 24 }}>
            <div className="rounded-2xl p-8" style={{ background: C.bgCard, border: `2px solid ${C.primary}`, backdropFilter: "blur(20px)", boxShadow: `0 0 40px ${C.primaryGlow}20` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Candidates</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: C.text, marginBottom: 4, fontFamily: "'Clash Display', sans-serif" }}>Free</p>
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 28 }}>Forever. No credit card.</p>
              {["Browse and apply to jobs", "AI Resume Builder (Tedo)", "Skills checklists", "Credential vault", "Reference network", "VaultSign e-signature"].map((t, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, listStyle: "none" }}>
                  <CheckCircle2 size={18} style={{ color: C.primary }} />
                  <span style={{ fontSize: 14, color: C.text }}>{t}</span>
                </li>
              ))}
            </div>
            <div className="rounded-2xl p-8" style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Recruiters & Employers</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: C.text, marginBottom: 4, fontFamily: "'Clash Display', sans-serif" }}>70/30</p>
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 28 }}>Recruiters keep 70%. Employers set the budget.</p>
              {["Search candidate pool", "Bring your own candidates", "90-day exclusive ownership", "Credit-gated contact reveal", "Employers post jobs directly", "First-submission-wins protection"].map((t, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, listStyle: "none" }}>
                  <CheckCircle2 size={18} style={{ color: C.textMuted }} />
                  <span style={{ fontSize: 14, color: C.text }}>{t}</span>
                </li>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS — Floating Cards ═══ */}
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Testimonials</span>
            <h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, fontFamily: "'Clash Display', sans-serif" }}>What users say</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl p-8"
                style={{
                  background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)",
                  animation: `float-card ${5 + i}s ease-in-out infinite ${i * 0.5}s`,
                }}
              >
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={18} style={{ color: "#FBBF24", fill: "#FBBF24" }} />)}
                </div>
                <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65, marginBottom: 24 }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.white, fontSize: 17 }}>{t.name[0]}</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{t.name}</p>
                    <p style={{ fontSize: 13, color: C.textMuted }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="scroll-reveal" style={{ padding: "96px 0", position: "relative", zIndex: 1 }}>
        <div style={{ position: "absolute", top: "-60px", left: "30%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.primary}15 0%, transparent 70%)`, filter: "blur(50px)" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 32px", textAlign: "center", position: "relative" }}>
          <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.text, marginBottom: 20, fontFamily: "'Clash Display', sans-serif" }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: C.textMuted, marginBottom: 36 }}>No credit card. No catch. Start in about a minute.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 8px 24px ${C.primaryGlow}` }}>I'm a Candidate <ArrowRight size={16} /></button></Link>
            <Link href="/agency-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)" }}>I'm a Recruiter</button></Link>
            <Link href="/employer-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)" }}>I'm an Employer</button></Link>
          </div>
          <p style={{ fontSize: 12, color: C.textDim, marginTop: 20 }}>No credit card required · HIPAA compliant · Free during launch</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: "rgba(0,0,0,0.3)", borderTop: `1px solid ${C.border}`, padding: "64px 0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "2fr 1fr 1fr 1fr 1.5fr" : "1fr 1fr", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 16 }}>M</div>
                <span style={{ fontWeight: 700, fontSize: 17, color: C.text }}>MyZipVault</span>
              </div>
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>The healthcare recruiter identity and intelligence layer.</p>
              <div style={{ display: "flex", gap: 10 }}>
                {["in", "f", "wa"].map(s => (
                  <a key={s} href="#" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.textMuted, textDecoration: "none", border: `1px solid ${C.border}`, transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.borderColor = C.borderHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = C.border; }}
                  >{s}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Platform</p>
              {[
                { label: "Browse Jobs", href: "/browse-jobs" },
                { label: "Marketplace", href: "/marketplace-flow" },
                { label: "Credit System", href: "/credit-system" },
                { label: "For Candidates", href: "/for-candidates" },
                { label: "For Recruiters", href: "/for-recruiters" },
              ].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: C.textMuted, textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.text}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}
              >{t.label}</Link>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Company</p>
              {[
                { label: "About", href: "/about" },
                { label: "Our Story", href: "/our-story" },
                { label: "Blog", href: "/blog" },
                { label: "Contact", href: "/contact" },
                { label: "Referral Program", href: "/referral-program" },
              ].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: C.textMuted, textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.text}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}
              >{t.label}</Link>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Legal</p>
              {[
                { label: "Terms", href: "/terms" },
                { label: "Privacy", href: "/privacy" },
                { label: "FAQ", href: "/faq" },
                { label: "Support", href: "/support" },
              ].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: C.textMuted, textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.text}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}
              >{t.label}</Link>)}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Newsletter</p>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Get product updates.</p>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="email" placeholder="your@email.com" style={{ flex: 1, padding: "10px 14px", fontSize: 13, borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", color: C.text, outline: "none" }} />
                <button style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.white, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", borderRadius: 8, cursor: "pointer" }}>→</button>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 24, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 12, color: C.textDim }}>© 2026 MyZipVault. All rights reserved.</p>
            <p style={{ fontSize: 12, color: C.textDim }}>Patent pending · USPTO #64/048,063</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
