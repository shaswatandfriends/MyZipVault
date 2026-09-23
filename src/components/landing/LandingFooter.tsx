"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { useLandingConfig } from "@/hooks/useLandingConfig";

export function LandingFooter() {
  const [isDesktop, setIsDesktop] = useState(true);
  const { config } = useLandingConfig();
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const { contactSocial } = config;

  const socialLinks = [
    { key: "in", label: "LinkedIn", url: contactSocial.linkedinUrl },
    { key: "f", label: "Facebook", url: contactSocial.facebookUrl },
    { key: "𝕏", label: "Twitter/X", url: contactSocial.twitterUrl },
    { key: "IG", label: "Instagram", url: contactSocial.instagramUrl },
    { key: "YT", label: "YouTube", url: contactSocial.youtubeUrl },
    { key: "wa", label: "WhatsApp", url: contactSocial.whatsappNumber ? `https://wa.me/${contactSocial.whatsappNumber.replace(/[^0-9]/g, "")}` : "" },
  ].filter((s) => s.url && s.url.length > 0);

  const footerCols = [
    {
      title: "Platform",
      links: [
        { label: "Network", href: "/" },
        { label: "Jobs", href: "/browse-jobs" },
        { label: "Communities", href: "/marketplace-flow" },
        { label: "Credentials", href: "/for-candidates" },
        { label: "Organizations", href: "/for-employers" },
      ],
    },
    {
      title: "For Professionals",
      links: [
        { label: "Profile", href: "/signup" },
        { label: "Connections", href: "/signup" },
        { label: "Opportunities", href: "/browse-jobs" },
        { label: "Career", href: "/for-candidates" },
      ],
    },
    {
      title: "For Recruiters",
      links: [
        { label: "Talent", href: "/agency-signup" },
        { label: "Search", href: "/agency-signup" },
        { label: "Hiring", href: "/agency-signup" },
        { label: "Verification", href: "/agency-signup" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Help", href: "/faq" },
        { label: "FAQs", href: "/faq" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Our Story", href: "/our-story" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ];

  return (
    <footer className="bg-deep-glass" style={{ padding: "80px 0 32px", position: "relative", zIndex: 1, color: C.textOnDeep }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "2fr 1fr 1fr 1fr 1fr 1fr" : "1fr 1fr", gap: 40, marginBottom: 56 }}>
          {/* Brand column */}
          <div>
            <img src="/logo.png" alt="MyZipVault" style={{ height: 72, width: "auto", marginBottom: 24 }} />
            <p style={{ fontSize: 16, color: "rgba(247,243,232,0.92)", marginBottom: 24, lineHeight: 1.6, maxWidth: 320, fontStyle: "italic" }}>
              The professional network built exclusively for healthcare.
            </p>
            {socialLinks.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {socialLinks.map((s) => (
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label} style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(247,243,232,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "rgba(247,243,232,0.90)", textDecoration: "none", border: "1px solid rgba(247,243,232,0.20)", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,169,97,0.20)"; e.currentTarget.style.borderColor = "rgba(201,169,97,0.50)"; e.currentTarget.style.color = "#C9A961"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(247,243,232,0.10)"; e.currentTarget.style.borderColor = "rgba(247,243,232,0.20)"; e.currentTarget.style.color = "rgba(247,243,232,0.90)"; }}>{s.key}</a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          {footerCols.map((col, ci) => (
            <div key={ci}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(247,243,232,0.95)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>{col.title}</p>
              {col.links.map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className="mzv-footer-link"
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: "rgba(247,243,232,0.88)",
                    textDecoration: "none",
                    marginBottom: 10,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#C9A961"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "rgba(247,243,232,0.88)"}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div style={{ paddingTop: 28, borderTop: "1px solid rgba(247,243,232,0.10)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13, color: "rgba(247,243,232,0.75)" }}>© 2026 MyZipVault. The professional network built exclusively for healthcare.</p>
          <p style={{ fontSize: 13, color: "rgba(247,243,232,0.75)" }}>HIPAA Aligned · 256-bit Encryption · BAA Available</p>
        </div>
      </div>
    </footer>
  );
}
