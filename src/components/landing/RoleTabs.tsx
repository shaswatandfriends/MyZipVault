"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Users, Search, Building2, ArrowRight, Briefcase } from "@/lib/icons";
import { candidateFeatures, recruiterFeatures, employerFeatures } from "@/lib/landing-content";
import { C } from "./theme";

function FeatureCard({ icon: Icon, title, desc, color }: { icon: typeof Briefcase; title: string; desc: string; color: string }) {
  return <div className="group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1" style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}><div className="flex size-10 items-center justify-center rounded-xl mb-3 transition-transform group-hover:scale-110" style={{ background: `${color}15`, border: `1px solid ${color}30` }}><Icon className="size-5" style={{ color }} /></div><h3 className="text-sm font-semibold mb-1.5" style={{ color: C.text }}>{title}</h3><p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{desc}</p></div>;
}

export function RoleTabs() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [viewTab, setViewTab] = useState<"candidate" | "recruiter" | "employer">("candidate");
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);
  const activeFeatures = viewTab === "candidate" ? candidateFeatures : viewTab === "recruiter" ? recruiterFeatures : employerFeatures;
  const signupLink = viewTab === "candidate" ? "/signup" : viewTab === "recruiter" ? "/agency-signup" : "/employer-signup";
  const ctaLabel = viewTab === "candidate" ? "I'm a Candidate" : viewTab === "recruiter" ? "I'm a Recruiter" : "I'm an Employer";
  return (
    <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}><h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginBottom: 12, fontFamily: "'Clash Display', sans-serif" }}>Built for all three sides.</h2><p style={{ fontSize: 16, color: C.textMuted, maxWidth: 600, margin: "0 auto" }}>Whether you're a healthcare professional, an independent recruiter, or a hiring employer — MyZipVault has you covered.</p></div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(255,255,255,0.03)", borderRadius: 28, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
            {[{ key: "candidate" as const, label: "For Candidates", icon: Users }, { key: "recruiter" as const, label: "For Recruiters", icon: Search }, { key: "employer" as const, label: "For Employers", icon: Building2 }].map((tab) => (
              <button key={tab.key} onClick={() => setViewTab(tab.key)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 22, cursor: "pointer", transition: "all 0.3s", display: "flex", alignItems: "center", gap: 6, background: viewTab === tab.key ? `linear-gradient(135deg, ${C.primary}, ${C.accent})` : "transparent", color: viewTab === tab.key ? C.white : C.textMuted, border: "none", boxShadow: viewTab === tab.key ? `0 4px 12px ${C.primaryGlow}` : "none" }}><tab.icon className="size-4" />{tab.label}</button>
            ))}
          </div>
        </div>
        <div key={viewTab} className="tab-transition" style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 20 }}>
          {activeFeatures.map((f, i) => { const colors = [C.primary, C.accent, C.emerald, C.amber, C.violet, C.primary]; const color = colors[i % colors.length]; return <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} color={color} />; })}
        </div>
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link href={signupLink}><button style={{ padding: "14px 32px", fontSize: 15, fontWeight: 600, color: C.white, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", cursor: "pointer", borderRadius: 28, boxShadow: `0 8px 24px ${C.primaryGlow}`, transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>{ctaLabel} <ArrowRight size={16} style={{ display: "inline" }} /></button></Link>
        </div>
      </div>
    </section>
  );
}
