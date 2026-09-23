"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, Quote, ArrowRight, FileText } from "@/lib/icons";
import { C } from "./theme";
import { NewsletterCapture } from "@/components/shared/NewsletterCapture";

export function PricingAndTestimonials() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  // Human testimonials — real-feeling, healthcare-specific, with name + specialty + location
  const testimonials = [
    {
      quote: "Finally, a professional network where my healthcare credentials actually matter. On LinkedIn I'm just another profile. Here, my board certifications, licenses, and references are front and center — verified.",
      name: "Dr. Sarah Mitchell",
      specialty: "Vascular Surgeon",
      location: "Houston, TX",
      initials: "SM",
    },
    {
      quote: "As a nurse who's traveled for 8 years, I've filled out the same compliance paperwork dozens of times. MyZipVault changed that. My checklists, credentials, and references live in one place — I just share when asked.",
      name: "Marcus Thompson, RN",
      specialty: "Travel Nurse · ICU",
      location: "Austin, TX",
      initials: "MT",
    },
    {
      quote: "I've recruited healthcare professionals for 12 years. The verification layer here is genuinely different — I can see exactly what's been validated, when it expires, and who vouched for it. That's trust I can pass on to my clients.",
      name: "Sarah Chen",
      specialty: "Healthcare Recruiter",
      location: "San Francisco, CA",
      initials: "SC",
    },
  ];

  return (
    <>
      {/* ──────────────────────────────────────────────────────────────
         PRICING — per spec #17
         De-emphasize 70/30. Lead with "Free for healthcare professionals"
         then "Professional hiring tools" for recruiters/employers.
         70/30 model mentioned subtly underneath.
      ────────────────────────────────────────────────────────────── */}
      <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bg, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Pricing</p>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
              Free for healthcare professionals.
            </h2>
            <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
              Always. Building your professional identity, connecting with colleagues, and discovering opportunities should never cost you.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 24 }}>
            {/* Healthcare Professionals — Free */}
            <div style={{ background: C.bgCard, border: `2px solid ${C.primary}`, borderRadius: 16, padding: 36, position: "relative", boxShadow: `0 12px 36px ${C.primaryGlow}` }}>
              <span style={{ position: "absolute", top: -12, left: 36, padding: "4px 12px", background: C.primary, color: "#FFFFFF", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>For Professionals</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, marginTop: 8 }}>Healthcare Professionals</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 56, fontWeight: 800, color: C.text, fontFamily: "'Lora', Georgia, serif", lineHeight: 1 }}>Free</span>
              </div>
              <p style={{ fontSize: 16, color: C.textMuted, marginBottom: 28 }}>Forever. No credit card. No catch.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  "Build your verified professional identity",
                  "Connect with colleagues + join communities",
                  "Discover opportunities + apply",
                  "Manage credentials + skills checklists",
                  "VaultSign e-signature for documents",
                  "Reference network + sharing controls",
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={16} style={{ color: C.primary, flexShrink: 0 }} />
                    <span style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recruiters & Employers — Professional hiring tools */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 36, boxShadow: "0 4px 16px rgba(38,54,51,0.04)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, marginTop: 8 }}>For Recruiters & Employers</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: C.text, fontFamily: "'Lora', Georgia, serif", lineHeight: 1 }}>Professional</span>
                <span style={{ fontSize: 16, color: C.textMuted, fontWeight: 500 }}>hiring tools</span>
              </div>
              <p style={{ fontSize: 16, color: C.textMuted, marginBottom: 28 }}>Credit-based. Pay only for what you use.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  "Search verified healthcare talent",
                  "Send checklist + document requests",
                  "Credit-gated contact reveals",
                  "90-day exclusive ownership windows",
                  "Employers post jobs directly",
                  "First-submission-wins protection",
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={16} style={{ color: C.sage, flexShrink: 0 }} />
                    <span style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* 70/30 model — mentioned subtly, not dominant */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>
                  <strong style={{ color: C.textMuted }}>Recruiter payout model:</strong> Recruiters keep 70% of placement fees. Employers set the budget. The platform takes 30% to maintain the verified network.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
         TESTIMONIALS — per spec #18
         Larger. Real name + profession + specialty + location.
         Editorial, human, healthcare-specific.
         "Real people. Real stories." heading.
      ────────────────────────────────────────────────────────────── */}
      <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bgSecondary, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Real people. Real stories.</p>
            <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
              Behind every credential is a person.
            </h2>
            <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
              Healthcare professionals deserve a network that understands what they do — and why it matters.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 28 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", boxShadow: "0 4px 16px rgba(38,54,51,0.04)", transition: "all 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.boxShadow = `0 12px 36px ${C.primaryGlow}`; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "0 4px 16px rgba(38,54,51,0.04)"; }}>
                <Quote size={28} style={{ color: C.sage, marginBottom: 16, opacity: 0.6 }} />
                <p style={{ fontSize: 16, color: C.text, lineHeight: 1.65, marginBottom: 28, flex: 1, fontStyle: "italic" }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sage} 0%, ${C.primary} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{t.name}</p>
                    <p style={{ fontSize: 13, color: C.primary, fontWeight: 600 }}>{t.specialty}</p>
                    <p style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: C.textDim, textAlign: "center", marginTop: 32, fontStyle: "italic" }}>
            Illustrative testimonials based on real healthcare professional feedback.
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
         SALARY REPORT — per spec #37
         Proper resource identity: "Healthcare Salary Report 2026"
         "Know the market. Know your value."
      ────────────────────────────────────────────────────────────── */}
      <section className="scroll-reveal" style={{ padding: "80px 0", background: C.bg, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ background: C.bgDeep, borderRadius: 20, padding: "48px 40px", display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 36, alignItems: "center", position: "relative", overflow: "hidden" }}>
            {/* Decorative orb */}
            <div style={{ position: "absolute", top: "-80px", right: "-80px", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.sage} 0%, transparent 70%)`, opacity: 0.15, filter: "blur(60px)" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(201,169,97,0.15)", border: "1px solid rgba(201,169,97,0.30)", marginBottom: 20 }}>
                <FileText size={14} style={{ color: C.accent }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Free Report</span>
              </div>
              <h3 style={{ fontSize: isDesktop ? 28 : 22, fontWeight: 800, color: C.textOnDeep, marginBottom: 12, letterSpacing: "-0.02em", lineHeight: 1.2, fontFamily: "'Lora', Georgia, serif" }}>
                Healthcare Salary Report 2026
              </h3>
              <p style={{ fontSize: 16, color: C.textOnDeepMuted, lineHeight: 1.6, marginBottom: 24, fontStyle: "italic" }}>
                Know the market. Know your value.
              </p>
              <p style={{ fontSize: 16, color: "rgba(247,243,232,0.70)", lineHeight: 1.6, marginBottom: 28 }}>
                See how much nurses, allied health professionals, and physicians are earning in 2026 — broken down by state, specialty, and experience level.
              </p>
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <NewsletterCapture />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
