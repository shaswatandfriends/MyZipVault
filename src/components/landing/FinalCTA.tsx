"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { ArrowRight } from "@/lib/icons";

export function FinalCTA() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bgDeep, position: "relative", zIndex: 1, overflow: "hidden" }}>
      {/* Subtle decorative orbs */}
      <div style={{ position: "absolute", top: "-100px", left: "10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.sage} 0%, transparent 70%)`, opacity: 0.12, filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: "-150px", right: "5%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, opacity: 0.08, filter: "blur(100px)" }} />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <img src="/logo.png" alt="MyZipVault" style={{ height: 56, width: "auto", margin: "0 auto 32px", display: "block" }} />

        <h2 style={{ fontSize: isDesktop ? 44 : 32, fontWeight: 700, color: C.textOnDeep, marginBottom: 14, letterSpacing: "-0.025em", lineHeight: 1.1, fontFamily: "'Lora', Georgia, serif" }}>
          Ready to join the<br />healthcare network?
        </h2>

        <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 24 }}>
          The first healthcare-only professional social network
        </p>

        <p style={{ fontSize: 18, color: C.textOnDeepMuted, lineHeight: 1.6, marginBottom: 40, maxWidth: 540, margin: "0 auto 40px" }}>
          The professional network built exclusively for healthcare. Build your identity, connect with colleagues, and discover what's next.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup">
            <button style={{ padding: "16px 32px", fontSize: 15, fontWeight: 600, color: C.bgDeep, background: C.textOnDeep, border: "none", cursor: "pointer", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(247,243,232,0.25)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
              Get Started Free <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/login">
            <button style={{ padding: "16px 32px", fontSize: 15, fontWeight: 600, color: C.textOnDeep, background: "transparent", border: `2px solid ${C.accent}`, cursor: "pointer", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = C.bgDeep; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textOnDeep; }}>
              Sign In
            </button>
          </Link>
        </div>

        <p style={{ fontSize: 12, color: "rgba(247,243,232,0.40)", marginTop: 28 }}>
          Free for healthcare professionals · No credit card required
        </p>
      </div>
    </section>
  );
}
