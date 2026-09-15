"use client";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { CheckCircle2, ShieldCheck, Award, Briefcase, Users, ClipboardCheck, UserCheck } from "@/lib/icons";

export function Verification() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const checks = [
    { icon: UserCheck, label: "Identity", desc: "Government-verified identity" },
    { icon: Award, label: "License", desc: "Active state/national licenses" },
    { icon: ClipboardCheck, label: "Credentials", desc: "BLS, ACLS, board certifications" },
    { icon: Briefcase, label: "Experience", desc: "Employment history validated" },
    { icon: Users, label: "References", desc: "Professional references confirmed" },
    { icon: ShieldCheck, label: "Skills", desc: "Self-assessed + peer-endorsed" },
  ];

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bgDeep, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Verification</p>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.textOnDeep, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
            Trust starts with verification.
          </h2>
          <p style={{ fontSize: 16, color: C.textOnDeepMuted, maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
            Healthcare professionals deserve a network where professional identity means something. Every dimension of your profile can be verified.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: 20 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ background: "rgba(247,243,232,0.06)", border: "1px solid rgba(247,243,232,0.12)", borderRadius: 14, padding: 24, display: "flex", alignItems: "flex-start", gap: 14, transition: "all 0.3s", backdropFilter: "blur(20px)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(247,243,232,0.10)"; e.currentTarget.style.borderColor = "rgba(247,243,232,0.20)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(247,243,232,0.06)"; e.currentTarget.style.borderColor = "rgba(247,243,232,0.12)"; }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(143,169,156,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <c.icon size={18} style={{ color: C.sage }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textOnDeep }}>{c.label}</h3>
                  <CheckCircle2 size={14} style={{ color: C.sage }} />
                </div>
                <p style={{ fontSize: 13, color: C.textOnDeepMuted, lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Brand statement */}
        <div style={{ textAlign: "center", marginTop: 56, padding: "32px 24px", background: "rgba(247,243,232,0.04)", borderRadius: 16, border: "1px solid rgba(247,243,232,0.10)" }}>
          <p style={{ fontSize: isDesktop ? 22 : 18, fontWeight: 500, color: C.textOnDeep, fontStyle: "italic", lineHeight: 1.5, maxWidth: 720, margin: "0 auto" }}>
            "Behind every credential is a person. Behind every healthcare professional is a story."
          </p>
        </div>
      </div>
    </section>
  );
}
