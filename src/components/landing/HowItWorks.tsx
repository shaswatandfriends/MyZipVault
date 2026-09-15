"use client";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { User, ShieldCheck, Users, Search } from "@/lib/icons";

export function HowItWorks() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const steps = [
    { num: "01", icon: User, title: "Create", desc: "Build your professional identity — name, specialty, credentials, experience, and interests.", color: C.primary },
    { num: "02", icon: ShieldCheck, title: "Verify", desc: "Add credentials, licenses, and references. Get verified and earn trust badges on your profile.", color: C.primary },
    { num: "03", icon: Users, title: "Connect", desc: "Meet healthcare professionals and organizations. Join specialty communities. Build your network.", color: C.primary },
    { num: "04", icon: Search, title: "Discover", desc: "Find opportunities, talent, communities, and resources — all within the healthcare ecosystem.", color: C.primary },
  ];

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bg, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
            How MyZipVault works
          </h2>
          <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
            Four steps to building your healthcare professional identity.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr", gap: 24, position: "relative" }}>
          {/* Connecting line on desktop */}
          {isDesktop && (
            <div style={{ position: "absolute", top: 60, left: "12%", right: "12%", height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`, zIndex: 0 }} />
          )}

          {steps.map((step, i) => (
            <div key={i} style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <div style={{ width: 120, height: 120, margin: "0 auto 24px", borderRadius: "50%", background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: `0 8px 24px ${C.primaryGlow}` }}>
                <step.icon size={36} style={{ color: step.color }} />
                <span style={{ position: "absolute", top: -8, right: -8, width: 32, height: 32, borderRadius: "50%", background: C.primary, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{step.num}</span>
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 10, letterSpacing: "-0.01em" }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, maxWidth: 240, margin: "0 auto" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
