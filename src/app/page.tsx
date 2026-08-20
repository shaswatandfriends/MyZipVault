"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu, X, ChevronDown, ShieldCheck, Briefcase, Users, HelpCircle,
  FileSignature, CreditCard, Mail, ArrowRight, Building2, Globe,
} from "@/lib/icons";

// ─── LinkedIn Blue Palette (landing page only, does NOT touch globals.css) ─
const C = {
  darkNavy: "#004182",
  midNavy: "#0073B1",
  primary: "#0A66C2",
  primaryLight: "#70B5F9",
  primaryTint: "#DCEAF8",
  white: "#FFFFFF",
  surface: "#F3F2F0",
  text: "#111827",
  muted: "#6B7280",
};

// ─── Hamburger Menu Items ────────────────────────────────────────────────
const menuSections = [
  {
    title: "ABOUT",
    items: [
      { label: "What is MyZipVault?", href: "#about" },
      { label: "Our Story", href: "#story" },
      { label: "Contact", href: "#contact" },
      { label: "Referral Program", href: "#referral" },
    ],
  },
  {
    title: "HOW IT WORKS",
    items: [
      { label: "For Candidates", href: "#for-candidates" },
      { label: "For Recruiters", href: "#for-recruiters" },
      { label: "Marketplace Flow", href: "#marketplace" },
      { label: "Credit System", href: "#credits" },
    ],
  },
  {
    title: "HELP",
    items: [
      { label: "FAQ", href: "#faq" },
      { label: "Support", href: "#support" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onResize(); // set initial
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.white }}>
      {/* ═══════════════════════════════════════════════════════════════
          HEADER — Sticky, with hamburger dropdown in top-right corner
      ═════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: scrolled ? C.white : "transparent",
          borderBottom: scrolled ? `1px solid ${C.surface}` : "none",
          transition: "background 0.3s ease, border 0.3s ease",
          boxShadow: scrolled ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${C.primary} 0%, ${C.darkNavy} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.white,
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            M
          </div>
          <span style={{ fontWeight: 600, fontSize: 18, color: C.text }}>
            MyZipVault
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#for-candidates" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>
            For Candidates
          </a>
          <a href="#for-recruiters" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>
            For Recruiters
          </a>
          <a href="#marketplace" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>
            How It Works
          </a>
          <a href="#faq" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>
            FAQ
          </a>
        </nav>

        {/* Right side: hamburger + auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Sign In — desktop only */}
          <Link href="/login" style={{ display: isDesktop ? "inline" : "none" }}>
            <button
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 600,
                color: C.primary,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderRadius: 6,
              }}
            >
              Sign In
            </button>
          </Link>

          {/* CTA — desktop only */}
          <Link href="/signup" style={{ display: isDesktop ? "inline" : "none" }}>
            <button
              style={{
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: C.white,
                background: C.primary,
                border: "none",
                cursor: "pointer",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Get Started <ArrowRight size={14} />
            </button>
          </Link>

          {/* Hamburger — top right corner */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: menuOpen ? C.primaryTint : "transparent",
              border: `1px solid ${menuOpen ? C.primary : C.surface}`,
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {menuOpen ? <X size={20} style={{ color: C.primary }} /> : <Menu size={20} style={{ color: C.text }} />}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          HAMBURGER DROPDOWN PANEL — slides down from top-right
      ═════════════════════════════════════════════════════════════════ */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.15)",
              zIndex: 48,
            }}
          />

          {/* Dropdown panel — positioned top-right */}
          <div
            style={{
              position: "fixed",
              top: 72,
              right: 24,
              width: 320,
              maxHeight: "80vh",
              overflowY: "auto",
              background: C.white,
              borderRadius: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
              border: `1px solid ${C.surface}`,
              zIndex: 49,
              padding: 16,
            }}
          >
            {menuSections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < menuSections.length - 1 ? 16 : 0 }}>
                <p style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                  paddingLeft: 8,
                }}>
                  {section.title}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {section.items.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        fontSize: 14,
                        color: C.text,
                        textDecoration: "none",
                        borderRadius: 6,
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.surface; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <ChevronDown size={14} style={{ color: C.muted, transform: "rotate(-90deg)" }} />
                      {item.label}
                    </a>
                  ))}
                </div>
                {si < menuSections.length - 1 && (
                  <div style={{ height: 1, background: C.surface, margin: "12px 0" }} />
                )}
              </div>
            ))}

            {/* Social in the menu */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.surface}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 8 }}>
                CONNECT
              </p>
              <div style={{ display: "flex", gap: 8, paddingLeft: 8 }}>
                {[
                  { label: "LinkedIn", href: "#", color: C.primary },
                  { label: "Facebook", href: "#", color: C.primary },
                  { label: "WhatsApp", href: "#", color: "#25D366" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    style={{
                      width: 36, height: 36,
                      borderRadius: 8,
                      background: C.surface,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: s.color,
                      textDecoration: "none",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryTint; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.surface; }}
                  >
                    {s.label === "LinkedIn" ? "in" : s.label === "Facebook" ? "f" : "wa"}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PLACEHOLDER BODY — will be replaced section by section
      ═════════════════════════════════════════════════════════════════ */}
      <main style={{ paddingTop: 120, paddingBottom: 60, textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            Header is ready — waiting for approval
          </h1>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.6 }}>
            The sticky header with hamburger dropdown is above. Scroll down to see
            it turn from transparent to white. Click the hamburger icon (top-right)
            to see the dropdown panel with organized navigation.
          </p>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 24 }}>
            Remaining sections will be built one at a time after approval:
            Hero → Stats → For Candidates → Your Career Your Data →
            For Recruiters → Marketplace Flow → Trust → Comparison →
            Profile Example → Credits → Pricing → Q&A → Testimonials →
            CTA → Footer
          </p>
        </div>
      </main>
    </div>
  );
}
