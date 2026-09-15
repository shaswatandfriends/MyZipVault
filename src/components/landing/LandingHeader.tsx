"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "@/lib/icons";
import { menuSections } from "@/lib/landing-content";
import { C } from "./theme";
import { useLandingConfig } from "@/hooks/useLandingConfig";

export function LandingHeader({ signupLink }: { signupLink: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { config } = useLandingConfig();
  const { branding } = config;
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onResize();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ height: 72, top: scrolled ? 12 : 0, left: scrolled ? 16 : 0, right: scrolled ? 16 : 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: scrolled ? "rgba(247, 243, 232, 0.82)" : "transparent", backdropFilter: scrolled ? "blur(32px) saturate(1.8)" : "none", WebkitBackdropFilter: scrolled ? "blur(32px) saturate(1.8)" : "none", border: scrolled ? `1px solid rgba(247,243,232,0.5)` : "none", borderBottom: scrolled ? `1px solid rgba(247,243,232,0.5)` : "none", borderRadius: scrolled ? 24 : 0, boxShadow: scrolled ? "0 8px 32px rgba(23, 74, 67, 0.10)" : "none" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", zIndex: 51 }}>
          {branding.logoUrl
            ? <img src={branding.logoUrl} alt={branding.logoText} style={{ height: 40, width: "auto" }} />
            : <span style={{ fontFamily: "'Clash Display', 'Lora', serif", fontSize: 26, fontWeight: 700, color: "#174A43", letterSpacing: "-0.02em", lineHeight: 1 }}>zip<span style={{ color: "#8FA99C" }}>Vault</span></span>
          }
          {(branding.tagline || branding.logoText) && !branding.logoUrl && (
            <span style={{ fontSize: 10, color: "#8B9994", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginLeft: 4, borderLeft: "1px solid rgba(38,54,51,0.15)", paddingLeft: 10 }}>{branding.tagline || "The Healthcare Network"}</span>
          )}
        </Link>
        <nav style={{ display: isDesktop ? "flex" : "none", alignItems: "center", gap: 28, zIndex: 51 }}>
          {[{ label: "Browse Jobs", href: "/browse-jobs" }, { label: "Blog", href: "/blog" }, { label: "How It Works", href: "/marketplace-flow" }, { label: "FAQ", href: "/faq" }].map((item, i) => (
            <Link key={i} href={item.href} style={{ fontSize: 14, color: scrolled ? "#5C6B66" : C.textMuted, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = scrolled ? "#174A43" : C.text} onMouseLeave={(e) => e.currentTarget.style.color = scrolled ? "#5C6B66" : C.textMuted}>{item.label}</Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 51 }}>
          <Link href="/login" style={{ display: isDesktop ? "inline" : "none" }}><button style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: scrolled ? "#174A43" : C.text, background: "transparent", border: `1px solid ${scrolled ? "rgba(38,54,51,0.2)" : C.border}`, cursor: "pointer", borderRadius: 24, transition: "all 0.2s" }}>Sign In</button></Link>
          <Link href={signupLink} style={{ display: isDesktop ? "inline" : "none" }}><button style={{ padding: "9px 22px", fontSize: 14, fontWeight: 600, color: C.white, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", cursor: "pointer", borderRadius: 24, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(23,74,67,0.25)", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>Get Started <ArrowRight size={14} /></button></Link>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: menuOpen ? "rgba(247,243,232,0.6)" : "transparent", border: `1px solid ${scrolled ? "rgba(38,54,51,0.2)" : C.border}`, borderRadius: 12, cursor: "pointer" }}>{menuOpen ? <X size={20} style={{ color: scrolled ? "#174A43" : C.text }} /> : <Menu size={20} style={{ color: scrolled ? "#174A43" : C.text }} />}</button>
        </div>
      </header>
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(38,54,51,0.5)", backdropFilter: "blur(4px)", zIndex: 48 }} />
          <div style={{ position: "fixed", top: 84, right: 24, width: 340, maxHeight: "85vh", overflowY: "auto", background: "rgba(247, 243, 232, 0.92)", backdropFilter: "blur(32px) saturate(1.8)", WebkitBackdropFilter: "blur(32px) saturate(1.8)", borderRadius: 20, border: `1px solid rgba(247,243,232,0.5)`, zIndex: 49, padding: 8, boxShadow: "0 20px 60px rgba(23,74,67,0.18)" }}>
            {menuSections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < menuSections.length - 1 ? 4 : 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#8B9994", textTransform: "uppercase", letterSpacing: "0.15em", padding: "12px 16px 6px" }}>{section.title}</p>
                {section.items.map((item) => (
                  <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", fontSize: 14, color: "#263633", textDecoration: "none", borderRadius: 10, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(23,74,67,0.06)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(23,74,67,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><item.icon size={16} style={{ color: "#174A43" }} /></div>{item.label}
                  </Link>
                ))}
                {si < menuSections.length - 1 && <div style={{ height: 1, background: "rgba(38,54,51,0.08)", margin: "8px 16px" }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
