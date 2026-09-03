"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, Star } from "@/lib/icons";
import { testimonials } from "@/lib/landing-content";
import { NewsletterCapture } from "@/components/shared/NewsletterCapture";
import { C } from "./theme";

export function PricingAndTestimonials() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);
  return (
    <>
      {/* PRICING */}
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pricing</span>
          <h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, marginBottom: 56, fontFamily: "'Clash Display', sans-serif" }}>Simple. Transparent. No surprises.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 24 }}>
            <div className="rounded-2xl p-8" style={{ background: C.bgCard, border: `2px solid ${C.primary}`, backdropFilter: "blur(20px)", boxShadow: `0 0 40px ${C.primaryGlow}20` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Candidates</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: C.text, marginBottom: 4, fontFamily: "'Clash Display', sans-serif" }}>Free</p>
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 28 }}>Forever. No credit card.</p>
              {["Browse and apply to jobs", "AI Resume Builder (Tedo)", "Skills checklists", "Credential vault", "Reference network", "VaultSign e-signature"].map((t, i) => (<li key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, listStyle: "none" }}><CheckCircle2 size={18} style={{ color: C.primary }} /><span style={{ fontSize: 14, color: C.text }}>{t}</span></li>))}
            </div>
            <div className="rounded-2xl p-8" style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For Recruiters & Employers</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: C.text, marginBottom: 4, fontFamily: "'Clash Display', sans-serif" }}>70/30</p>
              <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 28 }}>Recruiters keep 70%. Employers set the budget.</p>
              {["Search candidate pool", "Bring your own candidates", "90-day exclusive ownership", "Credit-gated contact reveal", "Employers post jobs directly", "First-submission-wins protection"].map((t, i) => (<li key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, listStyle: "none" }}><CheckCircle2 size={18} style={{ color: C.textMuted }} /><span style={{ fontSize: 14, color: C.text }}>{t}</span></li>))}
            </div>
          </div>
        </div>
      </section>
      {/* TESTIMONIALS */}
      <section className="scroll-reveal" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}><span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Testimonials</span><h2 style={{ fontSize: isDesktop ? 38 : 28, fontWeight: 800, color: C.text, marginTop: 10, fontFamily: "'Clash Display', sans-serif" }}>What users say</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl p-8" style={{ background: C.bgCard, border: `1px solid ${C.border}`, backdropFilter: "blur(20px)", animation: `float-card ${5 + i}s ease-in-out infinite ${i * 0.5}s` }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>{[1,2,3,4,5].map(s => <Star key={s} size={18} style={{ color: "#FBBF24", fill: "#FBBF24" }} />)}</div>
                <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65, marginBottom: 24 }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.white, fontSize: 17 }}>{t.name[0]}</div>
                  <div><p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{t.name}</p><p style={{ fontSize: 13, color: C.textMuted }}>{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="scroll-reveal" style={{ padding: "96px 0", position: "relative", zIndex: 1 }}>
        <div style={{ position: "absolute", top: "-60px", left: "30%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.primary}15 0%, transparent 70%)`, filter: "blur(50px)" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 32px", textAlign: "center", position: "relative" }}>
          <h2 style={{ fontSize: isDesktop ? 42 : 30, fontWeight: 800, color: C.text, marginBottom: 20, fontFamily: "'Clash Display', sans-serif" }}>Ready to get started?</h2>
          <p style={{ fontSize: 16, color: C.textMuted, marginBottom: 36 }}>No credit card. No catch. Start in about a minute.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.white, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", cursor: "pointer", borderRadius: 28, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 8px 24px ${C.primaryGlow}` }}>I'm a Candidate →</button></a>
            <a href="/agency-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)" }}>I'm a Recruiter</button></a>
            <a href="/employer-signup"><button style={{ padding: "16px 32px", fontSize: 16, fontWeight: 600, color: C.text, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 28, backdropFilter: "blur(20px)" }}>I'm an Employer</button></a>
          </div>
          <p style={{ fontSize: 12, color: C.textDim, marginTop: 20 }}>No credit card required · HIPAA compliant · Free during launch</p>
        </div>
      </section>
      {/* NEWSLETTER */}
      <section className="scroll-reveal" style={{ padding: "64px 0 96px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, marginBottom: 20 }}><span style={{ fontSize: 16 }}>📊</span><span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>FREE REPORT</span></div>
          <h2 style={{ fontSize: isDesktop ? 34 : 24, fontWeight: 700, color: C.text, marginBottom: 12, fontFamily: "'Clash Display', sans-serif" }}>Get the 2026 Healthcare Salary Report</h2>
          <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 28, lineHeight: 1.6 }}>See how much nurses, allied health pros, and recruiters are earning in 2026 — broken down by state, specialty, and experience level.</p>
          <NewsletterCapture />
        </div>
      </section>
    </>
  );
}
