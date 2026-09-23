"use client";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { CheckCircle2, MapPin, Briefcase, Award, BookOpen, Users, Calendar, Heart } from "@/lib/icons";

export function ProfessionalIdentity() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bgSecondary, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 56, alignItems: "center" }}>
        {/* Left: copy */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Professional identity</p>
          <h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginBottom: 20, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
            More than a résumé.<br />A professional identity built for healthcare.
          </h2>
          <p style={{ fontSize: 16, color: C.textMuted, lineHeight: 1.65, marginBottom: 28, maxWidth: 480 }}>
            Your MyZipVault profile captures everything that matters: credentials, experience, skills, publications, connections, availability, and professional interests — verified and owned by you.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { icon: Award, label: "Credentials & licenses" },
              { icon: Briefcase, label: "Experience timeline" },
              { icon: BookOpen, label: "Publications" },
              { icon: Users, label: "Connections" },
              { icon: Calendar, label: "Availability status" },
              { icon: Heart, label: "Professional interests" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <item.icon size={14} style={{ color: C.primary }} />
                </div>
                <span style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: profile card mockup */}
        <div style={{ position: "relative" }}>
          <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: `0 12px 40px ${C.primaryGlow}`, overflow: "hidden" }}>
            {/* Header band */}
            <div style={{ height: 90, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.sage} 100%)`, padding: "20px 24px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 20 }}>
                <CheckCircle2 size={11} style={{ color: "#FFFFFF" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#FFFFFF" }}>Verified Professional</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>View Profile →</span>
            </div>

            {/* Body */}
            <div style={{ padding: "0 24px 24px", marginTop: -28 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sage} 0%, ${C.primary} 100%)`, border: `3px solid ${C.bgCard}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 700, fontSize: 20, marginBottom: 12 }}>JW</div>

              <h3 style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 2, letterSpacing: "-0.01em" }}>Dr. Jennifer Walsh</h3>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                Cardiologist · <MapPin size={11} style={{ color: C.textDim }} /> Chicago, IL
              </p>

              {/* Quick stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "14px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
                <div><p style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1 }}>14</p><p style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Years</p></div>
                <div><p style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1 }}>428</p><p style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Connections</p></div>
                <div><p style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1 }}>7</p><p style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Publications</p></div>
              </div>

              {/* Skills */}
              <p style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Skills</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {["Interventional Cardiology", "Echocardiography", "ECG", "Critical Care"].map((s, i) => (
                  <span key={i} style={{ padding: "4px 10px", background: C.sageLight, color: C.primary, borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{s}</span>
                ))}
              </div>

              {/* Status */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: C.sageLight, borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.primary }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>Open to opportunities</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
