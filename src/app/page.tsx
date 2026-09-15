"use client";

import { useEffect } from "react";
import { C, landingAnimations } from "@/components/landing/theme";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { RoleTabs } from "@/components/landing/RoleTabs";
import { MarketplaceFlow } from "@/components/landing/MarketplaceFlow";
import { PricingAndTestimonials } from "@/components/landing/PricingAndTestimonials";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("sr-visible"); observer.unobserve(entry.target); } }); },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: landingAnimations }} />

      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full blur-[120px] opacity-20" style={{ width: 600, height: 600, top: "-100px", left: "10%", background: `radial-gradient(circle, ${C.primary} 0%, transparent 70%)`, animation: "float-orb 20s ease-in-out infinite" }} />
        <div className="absolute rounded-full blur-[100px] opacity-15" style={{ width: 500, height: 500, top: "30%", right: "5%", background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, animation: "float-orb 25s ease-in-out infinite reverse" }} />
        <div className="absolute rounded-full blur-[120px] opacity-10" style={{ width: 700, height: 700, bottom: "-200px", left: "30%", background: `radial-gradient(circle, ${C.violet} 0%, transparent 70%)`, animation: "float-orb 30s ease-in-out infinite" }} />
      </div>

      <LandingHeader signupLink="/signup" />
      <HeroSection />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <div className="glass-section-dark scroll-reveal" style={{ marginBottom: 32, borderRadius: 32, overflow: "hidden" }}>
          <StatsBar />
        </div>
        <div className="glass-section-dark scroll-reveal" style={{ marginBottom: 32, borderRadius: 32, overflow: "hidden" }}>
          <RoleTabs />
        </div>
        <div className="glass-section-dark scroll-reveal" style={{ marginBottom: 32, borderRadius: 32, overflow: "hidden" }}>
          <MarketplaceFlow />
        </div>
        <div className="glass-section-dark scroll-reveal" style={{ marginBottom: 32, borderRadius: 32, overflow: "hidden" }}>
          <PricingAndTestimonials />
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
