"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Users, MapPin } from "@/lib/icons";
import { C } from "./theme";

export function HeroSection() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <section style={{ paddingTop: 160, paddingBottom: 80, position: "relative", zIndex: 1, overflow: "hidden", background: C.bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: isDesktop ? "1.1fr 0.9fr" : "1fr", gap: 56, alignItems: "center" }}>
        {/* Left: Headline + CTAs */}
        <div className="hero-text">
          {/* Tagline */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20 }}>
            The professional network built exclusively for healthcare
          </p>

          <h1 style={{ fontSize: isDesktop ? 52 : 36, fontWeight: 700, lineHeight: 1.1, marginBottom: 20, color: C.text, letterSpacing: "-0.02em", fontFamily: "'Lora', Georgia, serif" }}>
            Where healthcare<br />professionals connect.
          </h1>

          <p style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.6, marginBottom: 36, maxWidth: 500 }}>
            Build your professional identity, connect with colleagues, discover opportunities, and find trusted healthcare talent — all in one network.
          </p>

          {/* Three CTAs — professional is primary */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
            <Link href="/signup">
              <button style={{ padding: "15px 28px", fontSize: 15, fontWeight: 600, color: "#FFFFFF", background: C.primary, border: "none", cursor: "pointer", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 6px 20px ${C.primaryGlow}`, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryHover; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = "translateY(0)"; }}>
                I'm a Healthcare Professional <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/agency-signup">
              <button style={{ padding: "15px 28px", fontSize: 15, fontWeight: 600, color: C.primary, background: "#FFFFFF", border: `2px solid ${C.accent}`, cursor: "pointer", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = C.primary; }}>
                I'm a Recruiter
              </button>
            </Link>
            <Link href="/employer-signup">
              <button style={{ padding: "15px 28px", fontSize: 15, fontWeight: 600, color: C.primary, background: "transparent", border: `2px solid ${C.primary}`, cursor: "pointer", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.primary; }}>
                I'm an Employer
              </button>
            </Link>
          </div>

          {/* Handwritten editorial statement — per reference */}
          <p style={{ fontSize: 24, color: C.sage, fontFamily: "var(--font-caveat), 'Caveat', cursive", lineHeight: 1.4, maxWidth: 400, marginTop: 8 }}>
            Behind every credential is a person.
          </p>

          {/* Trust line */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 28 }}>
            {["HIPAA Aligned", "256-bit Encryption", "BAA Available"].map((t, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textDim, fontWeight: 500 }}>
                <CheckCircle2 className="size-4" style={{ color: C.primary }} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Large Z watermark + profile card */}
        <div style={{ position: "relative" }} className={isDesktop ? "" : "hidden"}>
          {/* Large Z watermark behind the card */}
          <div style={{ position: "absolute", top: "-40px", right: "-20px", width: 320, height: 320, opacity: 0.08, pointerEvents: "none", zIndex: 0 }}>
            <img src="/logo.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          {/* Profile Card — floating on top of Z watermark */}
          <div style={{ position: "relative", zIndex: 1, animation: "float-card 6s ease-in-out infinite" }}>
            <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: `0 12px 48px ${C.primaryGlow}`, overflow: "hidden" }}>
              {/* Cover band — uses darker forest→darker-forest gradient so the
                  "Verified" glass pill in the top-right has guaranteed contrast. */}
              <div style={{ height: 80, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryHover} 100%)`, position: "relative" }}>
                <div style={{ position: "absolute", top: 12, right: 16, display: "flex", gap: 6 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, color: "#FFFFFF" }}>
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>
              </div>

              {/* Avatar + name */}
              <div style={{ padding: "0 24px 20px", marginTop: -32 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryHover} 100%)`, border: `3px solid ${C.bgCard}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 700, fontSize: 22, marginBottom: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px rgba(31,111,92,0.25)" }}>EC</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 2, fontFamily: "'Lora', Georgia, serif" }}>Dr. Emily Carter</h3>
                <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 12 }}>Vascular Surgeon · 12 years experience</p>

                {/* Verified badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.sageLight, color: C.primary, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    <ShieldCheck size={11} /> Identity Verified
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.sageLight, color: C.primary, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    <CheckCircle2 size={11} /> Credentials Verified
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, paddingTop: 16, borderTop: `1px solid ${C.border}`, marginBottom: 18 }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1 }}>342</p>
                    <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>Connections</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1 }}>12</p>
                    <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>Years exp.</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: C.accent, lineHeight: 1 }}>Open</p>
                    <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>to opportunities</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#FFFFFF", background: C.primary, border: "none", borderRadius: 10, cursor: "pointer" }}>Connect</button>
                  <button style={{ flex: 1, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer" }}>Message</button>
                  <button style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: C.textMuted, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer" }}>View</button>
                </div>
              </div>
            </div>

            {/* Floating connection bubble */}
            <div style={{ position: "absolute", top: -16, left: -20, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: `0 8px 24px ${C.primaryGlow}`, display: "flex", alignItems: "center", gap: 8, animation: "mzv-doodle-float 5s ease-in-out infinite" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.sageLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={14} style={{ color: C.primary }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1 }}>+12 new</p>
                <p style={{ fontSize: 9, color: C.textDim }}>connections today</p>
              </div>
            </div>

            {/* Floating location chip */}
            <div style={{ position: "absolute", bottom: -12, right: -12, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", boxShadow: `0 6px 18px ${C.primaryGlow}`, display: "flex", alignItems: "center", gap: 6, animation: "mzv-doodle-bounce 4s ease-in-out infinite" }}>
              <MapPin size={12} style={{ color: C.accent }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Boston, MA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
