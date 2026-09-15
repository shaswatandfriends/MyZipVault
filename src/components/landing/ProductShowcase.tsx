"use client";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { CheckCircle2, ShieldCheck, Users, FileSignature, Calendar, Bell } from "@/lib/icons";

/**
 * ProductShowcase — per spec #33
 * "This is what MyZipVault actually looks like."
 * Shows a realistic dashboard UI mockup with sidebar + content panels.
 */
export function ProductShowcase() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const sidebarItems = [
    { icon: Users, label: "Dashboard", active: true },
    { icon: Users, label: "Network" },
    { icon: FileSignature, label: "Credentials" },
    { icon: Calendar, label: "Calendar" },
    { icon: Bell, label: "Messages" },
  ];

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bgSecondary, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>The product</p>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
            This is what MyZipVault looks like.
          </h2>
          <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
            One identity. One network. One place for everything that matters in your healthcare career.
          </p>
        </div>

        {/* Realistic UI mockup — desktop browser + mobile phone side by side */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          {/* Desktop browser frame */}
          <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: `0 24px 80px ${C.primaryGlow}`, overflow: "hidden", maxWidth: 680, flex: "1 1 680px" }}>
          {/* Browser chrome */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.bgSecondary }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#E5DFCF" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#E5DFCF" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#E5DFCF" }} />
            </div>
            <div style={{ flex: 1, maxWidth: 360, margin: "0 auto", padding: "4px 12px", background: C.bgCard, borderRadius: 6, fontSize: 11, color: C.textDim, textAlign: "center" }}>
              🔒 myzipvault.com/dashboard
            </div>
          </div>

          {/* Dashboard body */}
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "200px 1fr" : "1fr", minHeight: 420 }}>
            {/* Sidebar */}
            <div style={{ background: C.bgDeep, padding: "20px 16px", display: isDesktop ? "flex" : "none", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(247,243,232,0.10)" }}>
                <img src="/logo.png" alt="MyZipVault" style={{ height: 24, width: "auto" }} />
              </div>
              {sidebarItems.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: item.active ? "rgba(143,169,156,0.18)" : "transparent", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => { if (!item.active) e.currentTarget.style.background = "rgba(247,243,232,0.05)"; }} onMouseLeave={(e) => { if (!item.active) e.currentTarget.style.background = "transparent"; }}>
                  <item.icon size={15} style={{ color: item.active ? C.sage : "rgba(247,243,232,0.50)" }} />
                  <span style={{ fontSize: 13, fontWeight: item.active ? 600 : 500, color: item.active ? C.textOnDeep : "rgba(247,243,232,0.60)" }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div style={{ padding: 24, background: C.bg }}>
              {/* Welcome header */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, color: C.textDim, marginBottom: 4 }}>Welcome back,</p>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>Dr. Sarah Khan</h3>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Profile completion", value: "92%", color: C.primary },
                  { label: "Connections", value: "342", color: C.text },
                  { label: "Verified items", value: "8", color: C.accent },
                ].map((s, i) => (
                  <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: C.textDim }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Recent activity</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: CheckCircle2, text: "BLS certification verified", time: "2h ago", color: C.primary },
                    { icon: Users, text: "Connected with Dr. Priya Mehta", time: "5h ago", color: C.sage },
                    { icon: ShieldCheck, text: "Identity verification completed", time: "1d ago", color: C.primary },
                  ].map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: C.sageLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <a.icon size={13} style={{ color: a.color }} />
                      </div>
                      <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{a.text}</span>
                      <span style={{ fontSize: 11, color: C.textDim }}>{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
          {/* End desktop browser frame */}

          {/* Mobile phone mockup */}
          <div style={{ width: 240, flexShrink: 0, animation: "float-card 5s ease-in-out infinite" }}>
            {/* Phone frame */}
            <div style={{ background: C.bgDeep, borderRadius: 28, padding: 8, boxShadow: `0 16px 48px ${C.primaryGlow}`, border: `1px solid ${C.border}` }}>
              {/* Notch */}
              <div style={{ width: 60, height: 6, background: "rgba(247,243,232,0.15)", borderRadius: 3, margin: "0 auto 8px" }} />
              {/* Screen */}
              <div style={{ background: C.bg, borderRadius: 20, overflow: "hidden", height: 380 }}>
                {/* Mobile header */}
                <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <img src="/logo.png" alt="MyZipVault" style={{ height: 20, width: "auto" }} />
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.sageLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bell size={11} style={{ color: C.primary }} />
                  </div>
                </div>

                {/* Mobile feed */}
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Feed post 1 */}
                  <div style={{ background: C.bgCard, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sage}, ${C.primary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#FFFFFF" }}>PM</div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1 }}>Dr. Priya Mehta</p>
                        <p style={{ fontSize: 9, color: C.textDim }}>Cardiologist · 2h</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>Discussing TAVR procedures in elderly patients...</p>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 9, color: C.textDim }}>❤️ 48</span>
                      <span style={{ fontSize: 9, color: C.textDim }}>💬 12</span>
                      <span style={{ fontSize: 9, color: C.textDim }}>↗ 8</span>
                    </div>
                  </div>

                  {/* Community card */}
                  <div style={{ background: C.sageLight, borderRadius: 10, padding: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.primary, marginBottom: 2 }}>Emergency Medicine</p>
                    <p style={{ fontSize: 9, color: C.textMuted }}>2,104 members · 12 online</p>
                  </div>

                  {/* Feed post 2 */}
                  <div style={{ background: C.bgCard, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#FFFFFF" }}>AS</div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1 }}>Dr. Aisha Sharma</p>
                        <p style={{ fontSize: 9, color: C.textDim }}>Emergency Medicine · 5h</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>ED staffing shortages — and the solutions that worked...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* End mobile phone mockup */}
        </div>
      </div>
    </section>
  );
}
