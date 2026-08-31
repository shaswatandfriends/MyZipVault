"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Users, FileSignature, Bell, CreditCard } from "@/lib/icons";
import { C } from "./theme";

export function HeroSection() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  return (
    <section style={{ paddingTop: 120, paddingBottom: 80, position: "relative", zIndex: 1, overflow: "hidden" }}>
      {/* ─── Animated healthcare doodles ─── */}
      <div style={{ position: "absolute", top: "12%", left: "4%", fontSize: 42, opacity: 0.12, animation: "mzv-doodle-float 6s ease-in-out infinite", willChange: "transform", pointerEvents: "none" }}>🩺</div>
      <div style={{ position: "absolute", top: "65%", left: "7%", fontSize: 36, opacity: 0.15, animation: "mzv-doodle-pulse 3s ease-in-out infinite", willChange: "transform", pointerEvents: "none" }}>❤️</div>
      <div style={{ position: "absolute", top: "18%", right: "7%", fontSize: 36, opacity: 0.15, animation: "mzv-doodle-bounce 3s ease-in-out infinite", willChange: "transform", pointerEvents: "none" }}>💰</div>
      <div style={{ position: "absolute", top: "68%", right: "5%", fontSize: 32, opacity: 0.15, animation: "mzv-doodle-float 7s ease-in-out infinite reverse", willChange: "transform", pointerEvents: "none" }}>⭐</div>
      <div style={{ position: "absolute", top: "8%", left: "48%", fontSize: 24, opacity: 0.12, animation: "mzv-doodle-sway 4s ease-in-out infinite", willChange: "transform", pointerEvents: "none" }}>➕</div>
      <div style={{ position: "absolute", top: "38%", right: "2%", fontSize: 38, opacity: 0.12, animation: "mzv-doodle-float 5s ease-in-out infinite reverse", willChange: "transform", pointerEvents: "none" }}>⚕️</div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: isDesktop ? "1.1fr 0.9fr" : "1fr", gap: 48, alignItems: "center" }}>
        {/* Left: Headline + CTAs */}
        <div className="hero-text">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(59,130,246,0.1)", border: `1px solid ${C.primary}30`, marginBottom: 24 }}>
            <Sparkles className="size-3.5" style={{ color: C.accent }} /><span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>Healthcare Recruiting Marketplace</span>
          </div>
          <h1 style={{ fontSize: isDesktop ? 52 : 36, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, background: `linear-gradient(135deg, ${C.text} 0%, ${C.primary} 50%, ${C.accent} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Clash Display', sans-serif" }}>Recruiters work for themselves, not for agencies.</h1>
          <p style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.6, marginBottom: 32, maxWidth: 500 }}>The first marketplace where healthcare professionals own their data, recruiters keep 70% of placement fees, and employers hire directly — no middleman markup.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            <Link href="/signup"><button style={{ padding: "14px 28px", fontSize: 15, fontWeight: 600, color: C.white, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 8px 24px ${C.primaryGlow}`, transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>I'm a Candidate <ArrowRight size={16} /></button></Link>
            <Link href="/agency-signup"><button style={{ padding: "14px 28px", fontSize: 15, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}>I'm a Recruiter</button></Link>
            <Link href="/employer-signup"><button style={{ padding: "14px 28px", fontSize: 15, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}>I'm an Employer</button></Link>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["HIPAA Aligned", "256-bit Encryption", "BAA Available"].map((t, i) => (<span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textDim }}><CheckCircle2 className="size-3.5" style={{ color: C.emerald }} /> {t}</span>))}
          </div>
        </div>
        {/* Right: Floating Dashboard Mockup */}
        <div style={{ position: "relative" }} className={isDesktop ? "" : "hidden"}>
          <div style={{ position: "relative", animation: "float-card 6s ease-in-out infinite" }}>
            <div className="absolute inset-0 rounded-3xl blur-3xl" style={{ background: `linear-gradient(135deg, ${C.primaryGlow}, ${C.accentGlow})`, transform: "scale(1.1)" }} />
            <div className="rounded-2xl backdrop-blur-xl overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}`, boxShadow: `0 0 40px ${C.primaryGlow}` }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: C.border }}>
                <div className="flex gap-1.5"><div className="size-2.5 rounded-full bg-red-400/60" /><div className="size-2.5 rounded-full bg-amber-400/60" /><div className="size-2.5 rounded-full bg-green-400/60" /></div>
                <div className="flex-1 mx-4"><div className="rounded-md px-3 py-1 text-[10px] text-center" style={{ background: "rgba(255,255,255,0.05)", color: C.textDim }}>🔒 myzipvault.com/dashboard</div></div>
              </div>
              <div className="p-5 space-y-4" style={{ minHeight: 380 }}>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: "Credentials", value: "12", icon: ShieldCheck, color: C.primary }, { label: "Checklists", value: "3", icon: CheckCircle2, color: C.emerald }, { label: "References", value: "5", icon: Users, color: C.accent }].map((stat, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}><stat.icon className="size-4 mb-2" style={{ color: stat.color }} /><p className="text-lg font-bold" style={{ color: C.text }}>{stat.value}</p><p className="text-[9px]" style={{ color: C.textMuted }}>{stat.label}</p></div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-medium" style={{ color: C.textMuted }}>Profile Completion</p><p className="text-[10px] font-bold" style={{ color: C.primary }}>85%</p></div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}><div className="h-full rounded-full" style={{ width: "85%", background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`, animation: "shimmer 2s ease-in-out infinite" }} /></div>
                </div>
                <div className="space-y-2">
                  {[{ icon: CheckCircle2, text: "BLS certificate verified", time: "2m ago", color: C.emerald }, { icon: FileSignature, text: "RTR signed via VaultSign", time: "1h ago", color: C.primary }, { icon: Bell, text: "New job match: ICU RN", time: "3h ago", color: C.accent }].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)" }}><div className="flex size-7 items-center justify-center rounded-lg" style={{ background: `${item.color}15` }}><item.icon className="size-3.5" style={{ color: item.color }} /></div><p className="text-[10px] flex-1" style={{ color: C.text }}>{item.text}</p><p className="text-[9px]" style={{ color: C.textDim }}>{item.time}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 rounded-xl px-4 py-2" style={{ background: `linear-gradient(135deg, ${C.emerald}, #059669)`, boxShadow: `0 8px 24px ${C.emerald}40`, animation: "float-card 4s ease-in-out infinite 0.5s" }}><p className="text-xs font-bold text-white">✓ HIPAA Aligned</p></div>
            <div className="absolute -bottom-6 -left-6 rounded-xl px-4 py-3" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, boxShadow: `0 8px 24px ${C.primaryGlow}`, animation: "float-card 5s ease-in-out infinite 1s" }}><div className="flex items-center gap-2"><CreditCard className="size-4 text-white" /><div><p className="text-[9px] text-white/70">Credits</p><p className="text-sm font-bold text-white">84</p></div></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
