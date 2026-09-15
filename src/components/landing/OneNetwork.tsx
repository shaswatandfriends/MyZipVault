"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { ArrowRight, Stethoscope, Search, Building2 } from "@/lib/icons";

export function OneNetwork() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const audiences = [
    {
      icon: Stethoscope,
      tag: "Primary",
      tagColor: C.accent,
      title: "For Healthcare Professionals",
      subtitle: "Connect. Build. Grow.",
      desc: "Build your verified professional identity, connect with colleagues, join specialty communities, discover opportunities, and manage your credentials — all in one place.",
      cta: "Join as a Professional",
      href: "/signup",
      isPrimary: true,
    },
    {
      icon: Search,
      tag: "Secondary",
      tagColor: C.sage,
      title: "For Recruiters",
      subtitle: "Discover verified healthcare talent.",
      desc: "Access a network of verified healthcare professionals. Send checklist requests, share documents, and place candidates with confidence.",
      cta: "Join as a Recruiter",
      href: "/agency-signup",
      isPrimary: false,
    },
    {
      icon: Building2,
      tag: "Secondary",
      tagColor: C.sage,
      title: "For Employers",
      subtitle: "Build trusted healthcare teams.",
      desc: "Post jobs, review anonymized submissions, and hire directly from a pool of verified healthcare professionals — no middleman markup.",
      cta: "Join as an Employer",
      href: "/employer-signup",
      isPrimary: false,
    },
  ];

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bgSecondary, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Three ways to participate</p>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
            One healthcare network.<br />Three ways to participate.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr", gap: 24 }}>
          {audiences.map((a, i) => (
            <div key={i} style={{
              background: C.bgCard,
              border: a.isPrimary ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 32,
              position: "relative",
              transition: "all 0.3s",
              boxShadow: a.isPrimary ? `0 12px 36px ${C.primaryGlow}` : "0 4px 16px rgba(38,54,51,0.04)",
            }} onMouseEnter={(e) => { if (!a.isPrimary) { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.boxShadow = `0 8px 24px ${C.primaryGlow}`; } }} onMouseLeave={(e) => { if (!a.isPrimary) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "0 4px 16px rgba(38,54,51,0.04)"; } }}>
              {a.isPrimary && (
                <span style={{ position: "absolute", top: -12, left: 32, padding: "4px 12px", background: C.primary, color: "#FFFFFF", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Recommended</span>
              )}

              <div style={{ width: 48, height: 48, borderRadius: 12, background: a.isPrimary ? C.sageLight : C.bgSecondary, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <a.icon size={22} style={{ color: C.primary }} />
              </div>

              <h3 style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }}>{a.title}</h3>
              <p style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 14, fontStyle: "italic" }}>{a.subtitle}</p>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, marginBottom: 24 }}>{a.desc}</p>

              <Link href={a.href}>
                <button style={{
                  padding: "11px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: a.isPrimary ? "#FFFFFF" : C.primary,
                  background: a.isPrimary ? C.primary : "transparent",
                  border: a.isPrimary ? "none" : `1px solid ${C.primary}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }} onMouseEnter={(e) => { if (a.isPrimary) e.currentTarget.style.background = C.primaryHover; }} onMouseLeave={(e) => { if (a.isPrimary) e.currentTarget.style.background = C.primary; }}>
                  {a.cta} <ArrowRight size={13} />
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
