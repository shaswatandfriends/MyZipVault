"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { C } from "./theme";

export function LandingFooter() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);
  return (
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
              {["in", "f", "wa"].map(s => (<a key={s} href="#" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.textMuted, textDecoration: "none", border: `1px solid ${C.border}`, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.borderColor = C.borderHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = C.border; }}>{s}</a>))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Platform</p>
            {[{ label: "Browse Jobs", href: "/browse-jobs" }, { label: "Marketplace", href: "/marketplace-flow" }, { label: "Credit System", href: "/credit-system" }, { label: "For Candidates", href: "/for-candidates" }, { label: "For Recruiters", href: "/for-recruiters" }].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: C.textMuted, textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = C.text} onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}>{t.label}</Link>)}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Company</p>
            {[{ label: "About", href: "/about" }, { label: "Our Story", href: "/our-story" }, { label: "Blog", href: "/blog" }, { label: "Contact", href: "/contact" }, { label: "Referral Program", href: "/referral-program" }].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: C.textMuted, textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = C.text} onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}>{t.label}</Link>)}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Legal</p>
            {[{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }, { label: "FAQ", href: "/faq" }, { label: "Support", href: "/support" }].map((t) => <Link key={t.label} href={t.href} style={{ display: "block", fontSize: 13, color: C.textMuted, textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = C.text} onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}>{t.label}</Link>)}
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
  );
}
