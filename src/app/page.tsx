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
    <div className="relative flex items-center rounded-full bg-[#F3F4F6] border border-[#E5E7EB] p-1">
      <button
        onClick={() => setView("candidate")}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 sm:px-4 sm:py-2 sm:text-sm ${
          view === "candidate"
            ? "bg-white text-[#111827] shadow-sm"
            : "text-[#6B7280] hover:text-[#111827]"
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
            ? "bg-white text-[#111827] shadow-sm"
            : "text-[#6B7280] hover:text-[#111827]"
        }`}
      >
        <Briefcase className="size-3.5" />
        <span className="hidden sm:inline">Staffing Agencies</span>
        <span className="sm:hidden">Agencies</span>
      </button>
    </div>
  );
}

function CandidateView() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 lg:py-32 bg-gradient-to-b from-[#F0FDF4] to-[#F8F7F4]">
        <div className="mx-auto max-w-4xl text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-4 py-1.5 text-sm font-medium text-[#166534]">
              ✦ Trusted by Healthcare Professionals
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-[#111827] text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-tight font-bold tracking-tight"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Stop Filling Out the Same Checklists.{" "}
            <span className="bg-gradient-to-r from-[#166534] to-[#0D9488] bg-clip-text text-transparent gradient-shimmer inline-block">
              Own Your Career
            </span>{" "}
            with MyZipVault.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-lg text-[#6B7280]"
          >
            The secure, candidate-controlled vault for healthcare professionals.
            Complete your skills checklists once, store your credentials, collect
            references, and share with recruiters on your terms.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <Link href="/signup">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#166534] px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-[#14532D]">
                Create Your Free Vault <ArrowRight className="size-4" />
              </button>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                <Shield className="size-3.5" /> HIPAA-Aligned Security
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                <Lock className="size-3.5" /> You Control Access
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                <Zap className="size-3.5" /> 100% Free for Nurses
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-[#F8F7F4]">
          <div className="mx-auto max-w-3xl text-center px-4">
            <span className="text-[#0D9488] text-xs font-medium tracking-widest uppercase">
              The Problem
            </span>
            <h2
              className="mt-3 text-[#111827] text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              The Problem Every Nurse Knows
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#6B7280]">
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
        <section className="py-20 md:py-24 bg-[#F8F7F4]">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center">
              <span className="text-[#0D9488] text-xs font-medium tracking-widest uppercase">
                How It Works
              </span>
              <h2
                className="mt-3 text-[#111827] text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                From Request to Hired in Minutes
              </h2>
              <p className="mt-3 text-[#6B7280]">
                Three steps. Under five minutes. Your career data, organized forever.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {/* Step 1 */}
              <div className="relative flex flex-col items-center text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534] text-xl font-bold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  1
                </div>
                <h3
                  className="mt-4 text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Create Your Vault
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Sign up free. Upload your resume and our builder auto-fills your profile. Add your BLS, ACLS, RN License, and immunizations in minutes.
                </p>
                <div className="absolute right-0 top-7 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-[#D1D5DB]" />
                </div>
              </div>
              {/* Step 2 */}
              <div className="relative flex flex-col items-center text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534] text-xl font-bold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  2
                </div>
                <h3
                  className="mt-4 text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Complete Your Checklists
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  When an agency requests a skills checklist, fill it out once. It stays in your vault for 30 days. Next agency asks? Click Share. No retakes.
                </p>
                <div className="absolute right-0 top-7 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-[#D1D5DB]" />
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534] text-xl font-bold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  3
                </div>
                <h3
                  className="mt-4 text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Share On Your Terms
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Grant expiring access to any recruiter — 7, 14, or 30 days. Revoke anytime. They see only what you allow. Nothing more.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Features - Bento Grid */}
      <section className="py-20 md:py-24 bg-[#F3F4F6]">
        <div className="mx-auto max-w-[1100px] px-4">
          <div className="text-center">
            <span className="text-[#0D9488] text-xs font-medium tracking-widest uppercase">
              Features
            </span>
            <h2
              className="mt-3 text-[#111827] text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Everything You Need. Nothing You Don&apos;t.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-12 gap-4">
            {/* Card 1 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full bg-white border border-[#E5E7EB] rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <ClipboardCheck className="size-6 text-[#166534] mb-4" />
                <h3
                  className="text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Complete Once, Reuse for 30 Days
                </h3>
                <p className="mt-3 leading-relaxed text-[#6B7280]">
                  Receive a checklist request from an agency. Rate yourself on our
                  industry-standard lists. Once submitted, it&apos;s saved in your
                  vault. If another agency asks for the same list within 30 days,
                  just click Share. No retakes. No redundancy.
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 2 - span-5 */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-[#166534] text-white rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <FileText className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Never Start From Scratch
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  Upload your current resume and our builder auto-fills your
                  profile. Next time you need to add a new assignment, click Add
                  Experience. Edit, update, and export a formatted resume in
                  seconds.
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 3 - span-5 */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-[#0D9488] text-white rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <Bell className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Never Let a Cert Expire Unnoticed
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  Upload your BLS, ACLS, RN License, and Immunizations. Turn on
                  expiration reminders and we&apos;ll alert you 30 days before
                  it&apos;s time to renew.
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 4 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full bg-white border border-[#E5E7EB] rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <Users className="size-6 text-[#166534] mb-4" />
                <h3
                  className="text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Build Your Verified Reference Network
                </h3>
                <p className="mt-3 leading-relaxed text-[#6B7280]">
                  Connect with your managers and request an evaluation. They get a
                  free vault too. Store their verified signed reference in your
                  vault, ready to share the second a recruiter asks.
                </p>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-[#166534] text-white">
          <div className="mx-auto max-w-4xl px-4">
            <div className="text-center">
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                Your Vault. Your Rules.{" "}
                <span className="text-[#CCFBF1]">Zero Surprises.</span>
              </h2>
              <p className="mt-4 text-lg" style={{ color: "rgba(255,255,255,0.7)" }}>
                We&apos;re not a job board. Recruiters can never browse your profile.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  <Lock className="size-6 text-white" />
                </div>
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Explicit Consent
                </h3>
                <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  A recruiter only sees what you share. Nothing is ever visible by default.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  <Timer className="size-6 text-white" />
                </div>
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Expiring Access
                </h3>
                <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  You set the timer — 7, 14, or 30 days. Access ends automatically.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  <Trash2 className="size-6 text-white" />
                </div>
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  No Data Hoarding
                </h3>
                <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  If you delete your account, all recruiter access is killed instantly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Final CTA */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-gradient-to-r from-[#166534] to-[#0D9488] text-white">
          <div className="mx-auto max-w-2xl text-center px-4">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Claim Your Free Vault Now
            </h2>
            <p className="mt-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              No credit card. No catch. Your career data, your control.
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-base font-semibold text-[#166534] transition-colors hover:bg-[#DCFCE7]">
                  Create Your Free Vault <ArrowRight className="size-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </FadeInOnScroll>
    </div>
  );
}

function RecruiterView() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-28 lg:py-32 bg-gradient-to-b from-[#F0FDF4] to-[#F8F7F4]">
        <div className="mx-auto max-w-4xl text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-4 py-1.5 text-sm font-medium text-[#166534]">
              ✦ Built for Staffing Agencies
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-[#111827] text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-tight font-bold tracking-tight"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Stop Chasing Nurses for{" "}
            <span className="bg-gradient-to-r from-[#166534] to-[#0D9488] bg-clip-text text-transparent gradient-shimmer inline-block">
              Checklists and References.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-lg text-[#6B7280]"
          >
            MyZipVault automates the healthcare compliance packet. Request a
            checklist, credentials, and references — and watch them complete in real
            time. No more endless email threads.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <Link href="/agency-signup">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#166534] px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-[#14532D]">
                Get Started <ArrowRight className="size-4" />
              </button>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                <Clock className="size-3.5" /> Real-Time Tracking
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                <Zap className="size-3.5" /> Credit-Based Pricing
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                <Shield className="size-3.5" /> HIPAA-Aligned
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-[#F8F7F4]">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center">
              <span className="text-[#0D9488] text-xs font-medium tracking-widest uppercase">
                How It Works
              </span>
              <h2
                className="mt-3 text-[#111827] text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                From Request to Hired in Minutes
              </h2>
              <p className="mt-3 text-[#6B7280]">
                Request, track, and receive — in real time.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {/* Step 1 */}
              <div className="relative flex flex-col items-center text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534] text-xl font-bold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  1
                </div>
                <h3
                  className="mt-4 text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Send a Request
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Request a checklist, credentials, and references from any nurse on the platform. One request, all documents.
                </p>
                <div className="absolute right-0 top-7 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-[#D1D5DB]" />
                </div>
              </div>
              {/* Step 2 */}
              <div className="relative flex flex-col items-center text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534] text-xl font-bold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  2
                </div>
                <h3
                  className="mt-4 text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Track in Real Time
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  See who opened your request, who is at 30% or 90%, and who has submitted. No more guessing or follow-up emails.
                </p>
                <div className="absolute right-0 top-7 hidden w-1/2 translate-x-1/2 sm:block">
                  <div className="border-t-2 border-dashed border-[#D1D5DB]" />
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534] text-xl font-bold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  3
                </div>
                <h3
                  className="mt-4 text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Access Verified Documents
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Nurses share via expiring, HIPAA-aligned links. You get compliant, verified documents without storing sensitive data.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Features - Bento Grid */}
      <section className="py-20 md:py-24 bg-[#F3F4F6]">
        <div className="mx-auto max-w-[1100px] px-4">
          <div className="text-center">
            <span className="text-[#0D9488] text-xs font-medium tracking-widest uppercase">
              Features
            </span>
            <h2
              className="mt-3 text-[#111827] text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Everything You Need. Nothing You Don&apos;t.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-12 gap-4">
            {/* Card 1 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full bg-white border border-[#E5E7EB] rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <Eye className="size-6 text-[#166534] mb-4" />
                <h3
                  className="text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Real-Time Tracking
                </h3>
                <p className="mt-3 leading-relaxed text-[#6B7280]">
                  See exactly who opened your request, who&apos;s currently filling
                  it out at 30% or 50% or 90%, and who has submitted. No more
                  guessing.
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 2 - span-5 */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-[#166534] text-white rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <FolderOpen className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Instant Document Access
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  Request a checklist and BLS. If the nurse shares their ACLS and
                  resume too, unlock each extra verified document for just 1
                  credit.
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 3 - span-5 */}
            <FadeInOnScroll className="col-span-12 md:col-span-5">
              <div className="h-full bg-[#0D9488] text-white rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <BadgeCheck className="size-6 text-white mb-4" />
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Verified References
                </h3>
                <p className="mt-3 leading-relaxed text-white/80">
                  When nurses request references from their managers, the manager
                  joins the vault. Next time you need a reference from that
                  manager, it&apos;s already verified.
                </p>
              </div>
            </FadeInOnScroll>

            {/* Card 4 - span-7 */}
            <FadeInOnScroll className="col-span-12 md:col-span-7">
              <div className="h-full bg-white border border-[#E5E7EB] rounded-2xl p-8 min-h-[220px] hover:shadow-md hover:-translate-y-0.5 transition-all">
                <Handshake className="size-6 text-[#166534] mb-4" />
                <h3
                  className="text-lg font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  HIPAA-Aligned Sharing
                </h3>
                <p className="mt-3 leading-relaxed text-[#6B7280]">
                  Candidates set expiring access links. You get compliant
                  verifiable documents without storing sensitive data in your own
                  inbox.
                </p>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FadeInOnScroll>
        <section className="py-20 md:py-24 bg-gradient-to-r from-[#166534] to-[#0D9488] text-white">
          <div className="mx-auto max-w-2xl text-center px-4">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Get Started
            </h2>
            <p className="mt-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              Compliance packets that complete themselves.
            </p>
            <div className="mt-8">
              <Link href="/agency-signup">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-base font-semibold text-[#166534] transition-colors hover:bg-[#DCFCE7]">
                  Get Started <ArrowRight className="size-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </FadeInOnScroll>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-[#111827] text-white py-12 px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              ZV
            </div>
            <span
              className="font-semibold text-lg text-white"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              MyZipVault
            </span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="mailto:support@myzipvault.com" className="hover:text-white transition-colors">
              Contact
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center gap-4 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <p className="text-sm text-white/40">
            &copy; 2025 MyZipVault. All rights reserved.
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
            <ShieldCheck className="size-3.5 text-white/60" />
            HIPAA-Aligned Security
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [view, setView] = useState<ViewMode>("candidate");

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-[#E5E7EB] bg-[#F8F7F4]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-[#166534] text-white font-bold text-sm"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              ZV
            </div>
            <span
              className="text-base font-semibold text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              MyZipVault
            </span>
          </div>
          <ViewToggle view={view} setView={setView} />
          <nav className="flex items-center gap-2">
            <Link href={view === "candidate" ? "/login" : "/agency-login"}>
              <button className="rounded-lg border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111827] hover:border-[#9CA3AF]">
                Log In
              </button>
            </Link>
            <Link href={view === "candidate" ? "/signup" : "/agency-signup"}>
              <button className="rounded-lg bg-[#166534] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14532D]">
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
            {view === "candidate" ? <CandidateView /> : <RecruiterView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
