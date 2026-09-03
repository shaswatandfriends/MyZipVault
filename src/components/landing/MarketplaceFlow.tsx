"use client";
import { useState, useEffect } from "react";
import { flowSteps, verificationItems } from "@/lib/landing-content";
import { CheckCircle2 } from "@/lib/icons";
import { C } from "./theme";

export function MarketplaceFlow() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);
  return (
    <>
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}><span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Marketplace Flow</span><h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, fontFamily: "'Clash Display', sans-serif" }}>How it works — 4 steps.</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr", gap: 24 }}>
            {flowSteps.map((step, i) => (
              <div key={i} style={{ position: "relative" }}>
                {i < flowSteps.length - 1 && <div style={{ position: "absolute", top: 28, left: "60%", right: "-40%", height: 2, background: `linear-gradient(90deg, ${C.primary}40, transparent)`, display: isDesktop ? "block" : "none" }} />}
                <div className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1" style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}20, ${C.accent}20)`, border: `1px solid ${C.primary}30`, display: "flex", alignItems: "center", justifyContent: "center" }}><step.icon size={22} style={{ color: C.primary }} /></div>
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
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}><span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Trust & Verification</span><h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, fontFamily: "'Clash Display', sans-serif" }}>Every credential, verified.</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {verificationItems.map((v) => (
              <div key={v.title} className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1" style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><v.icon size={24} style={{ color: C.accent }} /></div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 10 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, marginBottom: 20 }}>{v.desc}</p>
                <ul style={{ listStyle: "none", padding: 0 }}>{v.features.map((f, j) => (<li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}><CheckCircle2 size={16} style={{ color: C.emerald, flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: 14, color: C.textMuted }}>{f}</span></li>))}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
