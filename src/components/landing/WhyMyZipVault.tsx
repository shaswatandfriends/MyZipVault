"use client";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { Users, ShieldCheck, Search, TrendingUp } from "@/lib/icons";

export function WhyMyZipVault() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const pillars = [
    {
      num: "01",
      icon: Users,
      title: "CONNECT",
      tagline: "Professional network",
      desc: "Build your network with healthcare professionals who understand your work. Join specialty communities, follow colleagues, and join discussions that matter.",
      features: ["Professional network", "Communities", "Messaging", "Following", "Discussions"],
      color: C.primary,
    },
    {
      num: "02",
      icon: ShieldCheck,
      title: "VERIFY",
      tagline: "Credentials that matter",
      desc: "Your professional identity is more than a résumé. Verify your identity, licenses, credentials, references, and skills — and earn trust badges that mean something.",
      features: ["Credentials", "Licenses", "References", "Identity", "Skills"],
      color: C.primary,
    },
    {
      num: "03",
      icon: Search,
      title: "DISCOVER",
      tagline: "Opportunities + talent",
      desc: "Find opportunities, talent, organizations, and communities — all within the healthcare ecosystem. Recruitment lives here, alongside everything else.",
      features: ["Jobs", "Professionals", "Organizations", "Opportunities"],
      color: C.primary,
    },
    {
      num: "04",
      icon: TrendingUp,
      title: "GROW",
      tagline: "Career development",
      desc: "Build professional visibility. Learn from peers. Grow your career with a network that understands healthcare — not a generic professional site.",
      features: ["Career development", "Learning", "Networking", "Professional visibility"],
      color: C.primary,
    },
  ];

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bg, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Why MyZipVault</p>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
            Healthcare is different.<br />Your professional network should be too.
          </h2>
          <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
            Four pillars that make MyZipVault a healthcare professional network — not another recruitment SaaS.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 24 }}>
          {pillars.map((p, i) => (
            <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, transition: "all 0.3s", display: "flex", flexDirection: "column" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.boxShadow = `0 12px 36px ${C.primaryGlow}`; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
              {/* Number + icon */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.sageLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p.icon className="size-6" style={{ color: p.color }} />
                </div>
                <span style={{ fontSize: 28, fontWeight: 800, color: C.sage, opacity: 0.5, fontFamily: "'Lora', Georgia, serif" }}>{p.num}</span>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4, letterSpacing: "0.02em", fontFamily: "'Lora', Georgia, serif" }}>{p.title}</h3>
              <p style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.tagline}</p>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>{p.desc}</p>

              {/* Feature list */}
              <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}`, marginTop: "auto" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {p.features.map((f, fi) => (
                    <span key={fi} style={{ fontSize: 11, color: C.primary, background: C.sageLight, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
