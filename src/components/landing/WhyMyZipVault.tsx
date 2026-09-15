"use client";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { Stethoscope, ShieldCheck, User, Users } from "@/lib/icons";

export function WhyMyZipVault() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const pillars = [
    { icon: Stethoscope, title: "Healthcare-only", body: "Everyone belongs to the healthcare ecosystem. No generic professional noise — just your people.", color: C.primary },
    { icon: ShieldCheck, title: "Verified", body: "Credentials and professional identity matter. Every license, certification, and reference is verified.", color: C.primary },
    { icon: User, title: "Professional identity", body: "More than a résumé. A living profile that captures who you are as a healthcare professional.", color: C.primary },
    { icon: Users, title: "Real connections", body: "Connect with people who understand healthcare — your colleagues, mentors, and next opportunity.", color: C.primary },
  ];

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bg, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Why MyZipVault</p>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Clash Display', 'Inter', sans-serif" }}>
            Healthcare is different.<br />Your professional network should be too.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 24 }}>
          {pillars.map((p, i) => (
            <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, transition: "all 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.boxShadow = `0 8px 24px ${C.primaryGlow}`; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.sageLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <p.icon className="size-6" style={{ color: p.color }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 10, letterSpacing: "-0.01em" }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
