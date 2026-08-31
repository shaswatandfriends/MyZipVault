"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "@/lib/icons";
import { menuSections } from "@/lib/landing-content";
import { C } from "./theme";

export function LandingHeader({ signupLink }: { signupLink: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: scrolled ? "rgba(10,15,26,0.8)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? `1px solid ${C.border}` : "none" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", zIndex: 51 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 19, boxShadow: `0 4px 12px ${C.primaryGlow}` }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 19, color: C.text }}>MyZipVault</span>
        </Link>
        <nav style={{ display: isDesktop ? "flex" : "none", alignItems: "center", gap: 28, zIndex: 51 }}>
          {[{ label: "Browse Jobs", href: "/browse-jobs" }, { label: "Blog", href: "/blog" }, { label: "How It Works", href: "/marketplace-flow" }, { label: "FAQ", href: "/faq" }].map((item, i) => (
            <Link key={i} href={item.href} style={{ fontSize: 14, color: C.textMuted, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = C.text} onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}>{item.label}</Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 51 }}>
          <Link href="/login" style={{ display: isDesktop ? "inline" : "none" }}><button style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: C.text, background: "transparent", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 8, transition: "all 0.2s" }}>Sign In</button></Link>
          <Link href={signupLink} style={{ display: isDesktop ? "inline" : "none" }}><button style={{ padding: "9px 22px", fontSize: 14, fontWeight: 600, color: C.white, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", cursor: "pointer", borderRadius: 24, display: "flex", alignItems: "center", gap: 6, boxShadow: `0 4px 16px ${C.primaryGlow}`, transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>Get Started <ArrowRight size={14} /></button></Link>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: menuOpen ? C.bgCard : "transparent", border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>{menuOpen ? <X size={20} style={{ color: C.text }} /> : <Menu size={20} style={{ color: C.text }} />}</button>
        </div>
      </header>
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 48 }} />
          <div style={{ position: "fixed", top: 76, right: 24, width: 340, maxHeight: "85vh", overflowY: "auto", background: "rgba(10,15,26,0.95)", backdropFilter: "blur(24px)", borderRadius: 20, border: `1px solid ${C.border}`, zIndex: 49, padding: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            {menuSections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < menuSections.length - 1 ? 4 : 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.15em", padding: "12px 16px 6px" }}>{section.title}</p>
                {section.items.map((item) => (
                  <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", fontSize: 14, color: C.text, textDecoration: "none", borderRadius: 10, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}><item.icon size={16} style={{ color: C.primary }} /></div>{item.label}
                  </Link>
                ))}
                {si < menuSections.length - 1 && <div style={{ height: 1, background: C.border, margin: "8px 16px" }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
