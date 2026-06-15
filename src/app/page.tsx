"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ClipboardCheck,
  FileText,
  Bell,
  Users,
  Lock,
  Timer,
  Trash2,
  Eye,
  FolderOpen,
  BadgeCheck,
  Handshake,
  ArrowRight,
  Stethoscope,
  Briefcase,
  Shield,
  Zap,
  Clock,
  Upload,
  CheckCircle2,
} from "@/lib/icons";

interface LandingPageContent {
  hero: {
    candidateHeadline: string;
    candidateGradientText: string;
    candidateSubheadline: string;
    candidateCtaText: string;
    recruiterHeadline: string;
    recruiterGradientText: string;
    recruiterSubheadline: string;
    recruiterCtaText: string;
    trustLine1: string;
    trustLine2: string;
    trustLine3: string;
  };
  colors: {
    primary: string;
    accent: string;
    background: string;
    textPrimary: string;
    textSecondary: string;
  };
  featureCards: { icon: string; heading: string; body: string }[];
  privacySection: { icon: string; heading: string; body: string }[];
  howItWorks: { title: string; description: string }[];
  footer: {
    copyrightText: string;
    hipaaBadgeText: string;
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck,
  FileText,
  Bell,
  Users,
  Lock,
  Timer,
  Trash2,
  Eye,
  FolderOpen,
  BadgeCheck,
  Handshake,
  ShieldCheck,
  Shield,
  Zap,
  Clock,
  Upload,
  CheckCircle2,
};

function DynamicIcon({
  name,
  fallback: Fallback,
  className,
}: {
  name?: string;
  fallback: React.ComponentType<{ className?: string }>;
  className: string;
}) {
  const Icon = name && iconMap[name] ? iconMap[name] : Fallback;
  return <Icon className={className} />;
}

type ViewMode = "candidate" | "recruiter";

function FadeInOnScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ViewToggle({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  return (
    <div className="relative flex items-center rounded-full bg-surface-2 border border-border p-1">
      <button
        onClick={() => setView("candidate")}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 sm:px-4 sm:py-2 sm:text-sm ${
          view === "candidate"
            ? "bg-surface text-foreground shadow-sm"
            : "text-text-secondary hover:text-foreground"
        }`}
      >
        <Stethoscope className="size-3.5" />
        <span className="hidden sm:inline">Healthcare Professionals</span>
        <span className="sm:hidden">Professionals</span>
      </button>
      <button
        onClick={() => setView("recruiter")}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 sm:px-4 sm:py-2 sm:text-sm ${
          view === "recruiter"
            ? "bg-surface text-foreground shadow-sm"
            : "text-text-secondary hover:text-foreground"
        }`}
      >
        <Briefcase className="size-3.5" />
        <span className="hidden sm:inline">Staffing Agencies</span>
        <span className="sm:hidden">Agencies</span>
      </button>
    </div>
  );
}

/* ─── Trust & Authority Section ────────────────────────────────────── */
function TrustAuthoritySection() {
  return (
    <FadeInOnScroll>
      <section className="py-20 md:py-24 bg-background">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <span className="text-accent-teal text-xs font-medium tracking-widest uppercase">
              Trust & Security
            </span>
            <h2
              className="mt-3 text-foreground text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              Trusted by Healthcare Professionals
            </h2>
            <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
              Enterprise-grade security and compliance, built specifically for the healthcare industry.
            </p>
          </div>

          {/* Stat Counters */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div className="premium-card p-6">
              <div className="relative z-10">
                <div className="text-3xl sm:text-4xl font-bold text-primary">
                  <CountUpNumber target={10000} suffix="+" />
                </div>
                <p className="mt-2 text-sm text-text-secondary">Healthcare Professionals Verified</p>
              </div>
            </div>
            <div className="premium-card p-6">
              <div className="relative z-10">
                <div className="text-3xl sm:text-4xl font-bold text-accent-teal">
                  <CountUpNumber target={99.9} suffix="%" decimals={1} />
                </div>
                <p className="mt-2 text-sm text-text-secondary">Platform Uptime</p>
              </div>
            </div>
            <div className="premium-card p-6">
              <div className="relative z-10">
                <div className="text-3xl sm:text-4xl font-bold text-primary">
                  <CountUpNumber target={500} suffix="+" />
                </div>
                <p className="mt-2 text-sm text-text-secondary">Healthcare Facilities Trust Us</p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="glass-card-static bg-primary-light/50 p-5 text-center">
              <div className="relative z-10">
                <ShieldCheck className="size-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold text-foreground text-sm">HIPAA Compliant</h4>
                <p className="text-xs text-text-muted mt-1">Full regulatory compliance</p>
              </div>
            </div>
            <div className="glass-card-static bg-primary-light/50 p-5 text-center">
              <div className="relative z-10">
                <BadgeCheck className="size-8 text-accent-teal mx-auto mb-3" />
                <h4 className="font-semibold text-foreground text-sm">SOC 2 Type II</h4>
                <p className="text-xs text-text-muted mt-1">Certified security controls</p>
              </div>
            </div>
            <div className="glass-card-static bg-primary-light/50 p-5 text-center">
              <div className="relative z-10">
                <Lock className="size-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold text-foreground text-sm">256-bit Encryption</h4>
                <p className="text-xs text-text-muted mt-1">Bank-level data protection</p>
              </div>
            </div>
            <div className="glass-card-static bg-primary-light/50 p-5 text-center">
              <div className="relative z-10">
                <Shield className="size-8 text-accent-teal mx-auto mb-3" />
                <h4 className="font-semibold text-foreground text-sm">Background Verified</h4>
                <p className="text-xs text-text-muted mt-1">Identity authentication</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </FadeInOnScroll>
  );
}

/* ─── CountUp Animation Helper ─────────────────────────────────────── */
function CountUpNumber({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * target);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <span ref={ref} data-count>
      {decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString()}
      {suffix}
    </span>
  );
}

function CandidateView({ content }: { content?: LandingPageContent }) {
  return (
    <div className="flex flex-col">
      {/* Hero - Mesh Background + Floating Elements */}
      <section className="relative py-20 md:py-28 lg:py-32 overflow-hidden">
        {/* Mesh background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-light/30 to-background" />
        <div className="absolute top-20 left-[10%] size-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute top-40 right-[15%] size-48 rounded-full bg-accent-teal/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 left-[30%] size-56 rounded-full bg-accent-cyan/5 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        {/* Floating 3D decorative elements */}
        <div className="absolute top-24 right-[20%] animate-float opacity-20">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent-teal rotate-12" />
        </div>
        <div className="absolute top-48 left-[8%] animate-float-slow opacity-15">
          <div className="size-12 rounded-xl bg-gradient-to-br from-accent-teal to-accent-cyan -rotate-6" />
        </div>
        <div className="absolute bottom-32 right-[10%] animate-float opacity-10">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-primary-light to-primary rotate-45" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-4 py-1.5 text-sm font-medium text-primary">
              ✦ Trusted by Healthcare Professionals
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-foreground text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-tight font-bold tracking-tight"
            style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
          >
            {content?.hero?.candidateHeadline ?? "Stop Filling Out the Same Checklists."}{" "}
            <span className="bg-gradient-to-r from-primary to-accent-teal bg-clip-text text-transparent gradient-shimmer inline-block">
              {content?.hero?.candidateGradientText ?? "Own Your Career"}
            </span>{" "}
            with MyZipVault.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-lg text-text-secondary"
          >
            {content?.hero?.candidateSubheadline ?? "The secure, candidate-controlled vault for healthcare professionals. Complete your skills checklists once, store your credentials, collect references, and share with recruiters on your terms."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <Link href="/signup">
              <button className="btn-gradient inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold">
                {content?.hero?.candidateCtaText ?? "Create Your Free Vault"} <ArrowRight className="size-4" />
              </button>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Shield className="size-3.5" /> {content?.hero?.trustLine1 ?? "HIPAA-Aligned Security"}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Lock className="size-3.5" /> {content?.hero?.trustLine2 ?? "You Control Access"}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Zap className="size-3.5" /> {content?.hero?.trustLine3 ?? "100% Free for Nurses"}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-background">
          <div className="mx-auto max-w-3xl text-center px-4">
            <span className="text-accent-teal text-xs font-medium tracking-widest uppercase">
              The Problem
            </span>
            <h2
              className="mt-3 text-foreground text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              The Problem Every Nurse Knows
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-text-secondary">
              Every time you apply for a travel assignment, it&apos;s the same
              nightmare. Refilling the exact same Med-Surg skills checklist for the
              fifth time. Digging through your email to find a photo of your BLS
              card. Chasing down your old manager for a reference again. Wondering
              which recruiters still have your SSN and immunization records saved in
              their inbox. You&apos;re a professional. Your data deserves better.
            </p>
          </div>
        </section>
      </FadeInOnScroll>

      {/* How It Works */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-background">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center">
              <span className="text-accent-teal text-xs font-medium tracking-widest uppercase">
                How It Works
              </span>
              <h2
                className="mt-3 text-foreground text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
              >
                From Request to Hired in Minutes
              </h2>
              <p className="mt-3 text-text-secondary">
                Three steps. Under five minutes. Your career data, organized forever.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {/* Step 1 */}
              <div className="premium-card relative flex flex-col items-center text-center p-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-teal text-white text-xl font-bold"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    1
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.howItWorks?.[0]?.title ?? "Create Your Vault"}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {content?.howItWorks?.[0]?.description ?? "Sign up free. Upload your resume and our builder auto-fills your profile. Add your BLS, ACLS, RN License, and immunizations in minutes."}
                  </p>
                </div>
                <div className="absolute right-0 top-10 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-border-strong" />
                </div>
              </div>
              {/* Step 2 */}
              <div className="premium-card relative flex flex-col items-center text-center p-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-teal text-white text-xl font-bold"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    2
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.howItWorks?.[1]?.title ?? "Complete Your Checklists"}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {content?.howItWorks?.[1]?.description ?? "When an agency requests a skills checklist, fill it out once. It stays in your vault for 30 days. Next agency asks? Click Share. No retakes."}
                  </p>
                </div>
                <div className="absolute right-0 top-10 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-border-strong" />
                </div>
              </div>
              {/* Step 3 */}
              <div className="premium-card flex flex-col items-center text-center p-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-teal text-white text-xl font-bold"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    3
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.howItWorks?.[2]?.title ?? "Share On Your Terms"}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {content?.howItWorks?.[2]?.description ?? "Grant expiring access to any recruiter — 7, 14, or 30 days. Revoke anytime. They see only what you allow. Nothing more."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Trust & Authority */}
      <TrustAuthoritySection />

      {/* Features - Bento Grid */}
      <section className="py-20 md:py-24 bg-surface-2">
        <div className="mx-auto max-w-[1100px] px-4">
          <div className="text-center">
            <span className="text-accent-teal text-xs font-medium tracking-widest uppercase">
              Features
            </span>
            <h2
              className="mt-3 text-foreground text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              Everything You Need. Nothing You Don&apos;t.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-12 gap-4">
            {/* Card 1 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full premium-card p-8 min-h-[220px]">
                <div className="relative z-10">
                  <DynamicIcon name={content?.featureCards?.[0]?.icon} fallback={ClipboardCheck} className="size-6 text-primary mb-4" />
                  <h3
                    className="text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.featureCards?.[0]?.heading ?? "Complete Once, Reuse for 30 Days"}
                  </h3>
                  <p className="mt-3 leading-relaxed text-text-secondary">
                    {content?.featureCards?.[0]?.body ?? "Receive a checklist request from an agency. Rate yourself on our industry-standard lists. Once submitted, it's saved in your vault. If another agency asks for the same list within 30 days, just click Share. No retakes. No redundancy."}
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Card 2 - span-5 - Gradient */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-gradient-to-br from-primary to-accent-teal text-white rounded-[var(--radius-lg)] p-8 min-h-[220px] hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <DynamicIcon name={content?.featureCards?.[1]?.icon} fallback={FileText} className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                >
                  {content?.featureCards?.[1]?.heading ?? "Never Start From Scratch"}
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  {content?.featureCards?.[1]?.body ?? "Upload your current resume and our builder auto-fills your profile. Next time you need to add a new assignment, click Add Experience. Edit, update, and export a formatted resume in seconds."}
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 3 - span-5 - Teal Gradient */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-gradient-to-br from-accent-teal to-accent-cyan text-white rounded-[var(--radius-lg)] p-8 min-h-[220px] hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <DynamicIcon name={content?.featureCards?.[2]?.icon} fallback={Bell} className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                >
                  {content?.featureCards?.[2]?.heading ?? "Never Let a Cert Expire Unnoticed"}
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  {content?.featureCards?.[2]?.body ?? "Upload your BLS, ACLS, RN License, and Immunizations. Turn on expiration reminders and we'll alert you 30 days before it's time to renew."}
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 4 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full premium-card p-8 min-h-[220px]">
                <div className="relative z-10">
                  <DynamicIcon name={content?.featureCards?.[3]?.icon} fallback={Users} className="size-6 text-primary mb-4" />
                  <h3
                    className="text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.featureCards?.[3]?.heading ?? "Build Your Verified Reference Network"}
                  </h3>
                  <p className="mt-3 leading-relaxed text-text-secondary">
                    {content?.featureCards?.[3]?.body ?? "Connect with your managers and request an evaluation. They get a free vault too. Store their verified signed reference in your vault, ready to share the second a recruiter asks."}
                  </p>
                </div>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-gradient-to-r from-primary to-accent-teal text-white">
          <div className="mx-auto max-w-4xl px-4">
            <div className="text-center">
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
              >
                Your Vault. Your Rules.{" "}
                <span className="text-accent-light">Zero Surprises.</span>
              </h2>
              <p className="mt-4 text-lg text-white/70">
                We&apos;re not a job board. Recruiters can never browse your profile.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  <DynamicIcon name={content?.privacySection?.[0]?.icon} fallback={Lock} className="size-6 text-white" />
                </div>
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                >
                  {content?.privacySection?.[0]?.heading ?? "Explicit Consent"}
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {content?.privacySection?.[0]?.body ?? "A recruiter only sees what you share. Nothing is ever visible by default."}
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  <DynamicIcon name={content?.privacySection?.[1]?.icon} fallback={Timer} className="size-6 text-white" />
                </div>
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                >
                  {content?.privacySection?.[1]?.heading ?? "Expiring Access"}
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {content?.privacySection?.[1]?.body ?? "You set the timer — 7, 14, or 30 days. Access ends automatically."}
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  <DynamicIcon name={content?.privacySection?.[2]?.icon} fallback={Trash2} className="size-6 text-white" />
                </div>
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                >
                  {content?.privacySection?.[2]?.heading ?? "No Data Hoarding"}
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {content?.privacySection?.[2]?.body ?? "If you delete your account, all recruiter access is killed instantly."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Final CTA */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-gradient-to-r from-primary to-accent-teal text-white">
          <div className="mx-auto max-w-2xl text-center px-4">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              {content?.hero?.candidateCtaText ? `${content.hero.candidateCtaText} Now` : "Claim Your Free Vault Now"}
            </h2>
            <p className="mt-4 text-white/80">
              No credit card. No catch. Your career data, your control.
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light">
                  {content?.hero?.candidateCtaText ?? "Create Your Free Vault"} <ArrowRight className="size-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </FadeInOnScroll>
    </div>
  );
}

function RecruiterView({ content }: { content?: LandingPageContent }) {
  return (
    <div className="flex flex-col">
      {/* Hero - Mesh Background + Floating Elements */}
      <section className="relative py-20 md:py-28 lg:py-32 overflow-hidden">
        {/* Mesh background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-light/30 to-background" />
        <div className="absolute top-20 left-[10%] size-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute top-40 right-[15%] size-48 rounded-full bg-accent-teal/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 left-[30%] size-56 rounded-full bg-accent-cyan/5 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        {/* Floating 3D decorative elements */}
        <div className="absolute top-24 right-[20%] animate-float opacity-20">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent-teal rotate-12" />
        </div>
        <div className="absolute top-48 left-[8%] animate-float-slow opacity-15">
          <div className="size-12 rounded-xl bg-gradient-to-br from-accent-teal to-accent-cyan -rotate-6" />
        </div>
        <div className="absolute bottom-32 right-[10%] animate-float opacity-10">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-primary-light to-primary rotate-45" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-4 py-1.5 text-sm font-medium text-primary">
              ✦ Built for Staffing Agencies
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-foreground text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-tight font-bold tracking-tight"
            style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
          >
            {content?.hero?.recruiterHeadline ?? "Stop Chasing Nurses for"}{" "}
            <span className="bg-gradient-to-r from-primary to-accent-teal bg-clip-text text-transparent gradient-shimmer inline-block">
              {content?.hero?.recruiterGradientText ?? "Checklists and References."}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-lg text-text-secondary"
          >
            {content?.hero?.recruiterSubheadline ?? "MyZipVault automates the healthcare compliance packet. Request a checklist, credentials, and references — and watch them complete in real time. No more endless email threads."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <Link href="/agency-signup">
              <button className="btn-gradient inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold">
                {content?.hero?.recruiterCtaText ?? "Get Started"} <ArrowRight className="size-4" />
              </button>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Clock className="size-3.5" /> {content?.hero?.trustLine1 ?? "Real-Time Tracking"}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Zap className="size-3.5" /> {content?.hero?.trustLine2 ?? "Credit-Based Pricing"}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Shield className="size-3.5" /> {content?.hero?.trustLine3 ?? "HIPAA-Aligned"}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-background">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center">
              <span className="text-accent-teal text-xs font-medium tracking-widest uppercase">
                How It Works
              </span>
              <h2
                className="mt-3 text-foreground text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
              >
                From Request to Hired in Minutes
              </h2>
              <p className="mt-3 text-text-secondary">
                Request, track, and receive — in real time.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {/* Step 1 */}
              <div className="premium-card relative flex flex-col items-center text-center p-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-teal text-white text-xl font-bold"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    1
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.howItWorks?.[0]?.title ?? "Send a Request"}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {content?.howItWorks?.[0]?.description ?? "Request a checklist, credentials, and references from any nurse on the platform. One request, all documents."}
                  </p>
                </div>
                <div className="absolute right-0 top-10 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-border-strong" />
                </div>
              </div>
              {/* Step 2 */}
              <div className="premium-card relative flex flex-col items-center text-center p-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-teal text-white text-xl font-bold"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    2
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.howItWorks?.[1]?.title ?? "Track in Real Time"}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {content?.howItWorks?.[1]?.description ?? "See who opened your request, who is at 30% or 90%, and who has submitted. No more guessing or follow-up emails."}
                  </p>
                </div>
                <div className="absolute right-0 top-10 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-border-strong" />
                </div>
              </div>
              {/* Step 3 */}
              <div className="premium-card flex flex-col items-center text-center p-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-teal text-white text-xl font-bold"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    3
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.howItWorks?.[2]?.title ?? "Access Verified Documents"}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {content?.howItWorks?.[2]?.description ?? "Nurses share via expiring, HIPAA-aligned links. You get compliant, verified documents without storing sensitive data."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Trust & Authority */}
      <TrustAuthoritySection />

      {/* Features - Bento Grid */}
      <section className="py-20 md:py-24 bg-surface-2">
        <div className="mx-auto max-w-[1100px] px-4">
          <div className="text-center">
            <span className="text-accent-teal text-xs font-medium tracking-widest uppercase">
              Features
            </span>
            <h2
              className="mt-3 text-foreground text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              Everything You Need. Nothing You Don&apos;t.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-12 gap-4">
            {/* Card 1 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full premium-card p-8 min-h-[220px]">
                <div className="relative z-10">
                  <DynamicIcon name={content?.featureCards?.[0]?.icon} fallback={Eye} className="size-6 text-primary mb-4" />
                  <h3
                    className="text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.featureCards?.[0]?.heading ?? "Real-Time Tracking"}
                  </h3>
                  <p className="mt-3 leading-relaxed text-text-secondary">
                    {content?.featureCards?.[0]?.body ?? "See exactly who opened your request, who's currently filling it out at 30% or 50% or 90%, and who has submitted. No more guessing."}
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Card 2 - span-5 - Gradient */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-gradient-to-br from-primary to-accent-teal text-white rounded-[var(--radius-lg)] p-8 min-h-[220px] hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <DynamicIcon name={content?.featureCards?.[1]?.icon} fallback={FolderOpen} className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                >
                  {content?.featureCards?.[1]?.heading ?? "Instant Document Access"}
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  {content?.featureCards?.[1]?.body ?? "Request a checklist and BLS. If the nurse shares their ACLS and resume too, unlock each extra verified document for just 1 credit."}
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 3 - span-5 - Teal Gradient */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-gradient-to-br from-accent-teal to-accent-cyan text-white rounded-[var(--radius-lg)] p-8 min-h-[220px] hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <DynamicIcon name={content?.featureCards?.[2]?.icon} fallback={BadgeCheck} className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                >
                  {content?.featureCards?.[2]?.heading ?? "Verified References"}
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  {content?.featureCards?.[2]?.body ?? "When nurses request references from their managers, the manager joins the vault. Next time you need a reference from that manager, it's already verified."}
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 4 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full premium-card p-8 min-h-[220px]">
                <div className="relative z-10">
                  <DynamicIcon name={content?.featureCards?.[3]?.icon} fallback={Handshake} className="size-6 text-primary mb-4" />
                  <h3
                    className="text-lg font-semibold text-foreground"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {content?.featureCards?.[3]?.heading ?? "HIPAA-Aligned Sharing"}
                  </h3>
                  <p className="mt-3 leading-relaxed text-text-secondary">
                    {content?.featureCards?.[3]?.body ?? "Candidates set expiring access links. You get compliant verifiable documents without storing sensitive data in your own inbox."}
                  </p>
                </div>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-gradient-to-r from-primary to-accent-teal text-white">
          <div className="mx-auto max-w-2xl text-center px-4">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              {content?.hero?.recruiterCtaText ?? "Get Started"}
            </h2>
            <p className="mt-4 text-white/80">
              Compliance packets that complete themselves.
            </p>
            <div className="mt-8">
              <Link href="/agency-signup">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light">
                  {content?.hero?.recruiterCtaText ?? "Get Started"} <ArrowRight className="size-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </FadeInOnScroll>
    </div>
  );
}

function Footer({ content }: { content?: LandingPageContent }) {
  return (
    <footer className="bg-surface-3 text-foreground py-12 px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              ZV
            </div>
            <span
              className="font-semibold text-lg text-foreground"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              MyZipVault
            </span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="mailto:support@myzipvault.com" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center gap-4 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <p className="text-sm text-text-muted">
            &copy; {content?.footer?.copyrightText ?? "2025 MyZipVault. All rights reserved."}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-light/50 px-3 py-1 text-xs text-primary">
            <ShieldCheck className="size-3.5 text-primary" />
            {content?.footer?.hipaaBadgeText ?? "HIPAA-Aligned Security"}
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [view, setView] = useState<ViewMode>("candidate");
  const [content, setContent] = useState<LandingPageContent | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/superadmin/landing-page?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.json();
      })
      .then((data: LandingPageContent) => {
        if (data && Object.keys(data).length > 0) {
          setContent(data);
          // Inject custom colors as CSS variables so design tokens pick them up
          if (data.colors) {
            const root = document.documentElement;
            if (data.colors.primary && !data.colors.primary.startsWith("var(")) {
              root.style.setProperty("--primary", data.colors.primary);
              root.style.setProperty("--primary-foreground", "#FFFFFF");
              // Derive lighter/opacity shades
              root.style.setProperty("--primary-light", data.colors.primary + "1A"); // ~10% opacity
              root.style.setProperty("--primary-hover", data.colors.primary);
              root.style.setProperty("--primary-vivid", data.colors.primary);
            }
            if (data.colors.accent && !data.colors.accent.startsWith("var(")) {
              root.style.setProperty("--accent-teal", data.colors.accent);
              root.style.setProperty("--accent-light", data.colors.accent + "1A");
            }
            if (data.colors.background && !data.colors.background.startsWith("var(")) {
              root.style.setProperty("--background", data.colors.background);
            }
            if (data.colors.textPrimary && !data.colors.textPrimary.startsWith("var(")) {
              root.style.setProperty("--foreground", data.colors.textPrimary);
              root.style.setProperty("--text-primary", data.colors.textPrimary);
            }
            if (data.colors.textSecondary && !data.colors.textSecondary.startsWith("var(")) {
              root.style.setProperty("--text-secondary", data.colors.textSecondary);
            }
          }
        }
      })
      .catch((err) => {
        console.error("Landing page content fetch failed:", err);
        // Fallback to defaults — hardcoded defaults will be used
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky Header - Glass Header */}
      <header className="glass-header sticky top-0 z-50 h-16">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              ZV
            </div>
            <span
              className="text-base font-semibold text-foreground"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              MyZipVault
            </span>
          </div>
          <ViewToggle view={view} setView={setView} />
          <nav className="flex items-center gap-2">
            <Link href={view === "candidate" ? "/login" : "/agency-login"}>
              <button className="btn-outline-premium rounded-lg px-4 py-2 text-sm font-medium">
                Log In
              </button>
            </Link>
            <Link href={view === "candidate" ? "/signup" : "/agency-signup"}>
              <button className="btn-gradient rounded-lg px-4 py-2 text-sm font-medium">
                Sign Up
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {view === "candidate" ? <CandidateView content={content} /> : <RecruiterView content={content} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer content={content} />
    </div>
  );
}
