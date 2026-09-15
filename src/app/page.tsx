"use client";

import { useEffect } from "react";
import { C, landingAnimations } from "@/components/landing/theme";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhyMyZipVault } from "@/components/landing/WhyMyZipVault";
import { ProfessionalIdentity } from "@/components/landing/ProfessionalIdentity";
import { SocialFeed } from "@/components/landing/SocialFeed";
import { Verification } from "@/components/landing/Verification";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { OneNetwork } from "@/components/landing/OneNetwork";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingAndTestimonials } from "@/components/landing/PricingAndTestimonials";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { ZDivider } from "@/components/landing/ZDivider";
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

      {/* Subtle gradient mesh background — very low opacity, brand-tinted */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full blur-[120px] opacity-[0.08]" style={{ width: 600, height: 600, top: "-100px", left: "10%", background: `radial-gradient(circle, ${C.primary} 0%, transparent 70%)`, animation: "float-orb 20s ease-in-out infinite" }} />
        <div className="absolute rounded-full blur-[100px] opacity-[0.06]" style={{ width: 500, height: 500, top: "30%", right: "5%", background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, animation: "float-orb 25s ease-in-out infinite reverse" }} />
        <div className="absolute rounded-full blur-[120px] opacity-[0.05]" style={{ width: 700, height: 700, bottom: "-200px", left: "30%", background: `radial-gradient(circle, ${C.sage} 0%, transparent 70%)`, animation: "float-orb 30s ease-in-out infinite" }} />
      </div>

      {/*
        Page structure per rebrand spec — locked hierarchy:
        01 Hero
        02 Why MyZipVault (4 product pillars: CONNECT / VERIFY / DISCOVER / GROW)
        03 Professional identity ("More than a résumé")
        04 Healthcare network (Social feed)
        05 Verification (major trust pillar)
        06 Product showcase ("This is what MyZipVault looks like")
        07 One network. Three ways to participate.
        08 How it works (Create → Verify → Connect → Discover)
        09 Pricing
        10 Real people. Real stories. (Testimonials)
        11 Salary Report (Resources)
        12 Final CTA
        13 Footer
      */}
      <LandingHeader signupLink="/signup" />
      <HeroSection />
      <ZDivider />
      <WhyMyZipVault />
      <ProfessionalIdentity />
      <ZDivider color={C.primary} />
      <SocialFeed />
      <Verification />
      <ProductShowcase />
      <OneNetwork />
      <HowItWorks />
      <PricingAndTestimonials />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
