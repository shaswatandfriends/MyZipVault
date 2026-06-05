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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <div className="relative flex items-center rounded-full bg-muted p-1">
      <div
        className="absolute top-1 bottom-1 rounded-full bg-primary transition-all duration-300 ease-in-out"
        style={{
          left: view === "candidate" ? "4px" : "50%",
          width: "calc(50% - 4px)",
        }}
      />
      <button
        onClick={() => setView("candidate")}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300 sm:px-4 sm:py-2 sm:text-sm ${
          view === "candidate"
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Stethoscope className="size-3.5" />
        <span className="hidden sm:inline">Healthcare Professionals</span>
        <span className="sm:hidden">Professionals</span>
      </button>
      <button
        onClick={() => setView("recruiter")}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300 sm:px-4 sm:py-2 sm:text-sm ${
          view === "recruiter"
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
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
      <section className="px-4 py-14 md:py-18 lg:py-22">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Stop Filling Out the Same Checklists.{" "}
            <span className="text-primary">Own Your Career</span> with MyZipVault.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70 md:text-xl"
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
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                Create Your Free Vault <ArrowRight className="size-4" />
              </Button>
            </Link>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="size-3.5 text-primary" /> HIPAA-Aligned Security
              </span>
              <span className="hidden sm:inline text-border">—</span>
              <span className="flex items-center gap-1">You Control Access</span>
              <span className="hidden sm:inline text-border">—</span>
              <span className="flex items-center gap-1">
                100% Free for Nurses
              </span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Problem */}
      <FadeInOnScroll>
        <section className="border-t border-b bg-muted/30 px-4 py-14 md:py-18">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              The Problem Every Nurse Knows
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-foreground/75 md:text-xl">
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
        <section className="px-4 py-14 md:py-18">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-3 text-foreground/60">
                Three steps. Under five minutes. Your career data, organized forever.
              </p>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {/* Step 1 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  1
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Create Your Vault</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  Sign up free. Upload your resume and our builder auto-fills your profile. Add your BLS, ACLS, RN License, and immunizations in minutes.
                </p>
                <div className="absolute right-0 top-7 hidden h-px w-1/2 translate-x-1/2 bg-border sm:block" />
              </div>
              {/* Step 2 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  2
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Complete Your Checklists</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  When an agency requests a skills checklist, fill it out once. It stays in your vault for 30 days. Next agency asks? Click Share. No retakes.
                </p>
                <div className="absolute right-0 top-7 hidden h-px w-1/2 translate-x-1/2 bg-border sm:block" />
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  3
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Share On Your Terms</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  Grant expiring access to any recruiter — 7, 14, or 30 days. Revoke anytime. They see only what you allow. Nothing more.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Features */}
      <section className="border-t px-4 py-14 md:py-18">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2">
            {/* Feature 1 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <ClipboardCheck className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Complete Once, Reuse for 30 Days
                  </h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    Receive a checklist request from an agency. Rate yourself on our
                    industry-standard lists. Once submitted, it&apos;s saved in your
                    vault. If another agency asks for the same list within 30 days,
                    just click Share. No retakes. No redundancy.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Feature 2 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Never Start From Scratch
                  </h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    Upload your current resume and our builder auto-fills your
                    profile. Next time you need to add a new assignment, click Add
                    Experience. Edit, update, and export a formatted resume in
                    seconds.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Feature 3 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Bell className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Never Let a Cert Expire Unnoticed
                  </h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    Upload your BLS, ACLS, RN License, and Immunizations. Turn on
                    expiration reminders and we&apos;ll alert you 30 days before
                    it&apos;s time to renew.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Feature 4 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Build Your Verified Reference Network
                  </h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    Connect with your managers and request an evaluation. They get a
                    free vault too. Store their verified signed reference in your
                    vault, ready to share the second a recruiter asks.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <FadeInOnScroll>
        <section className="border-t bg-muted/30 px-4 py-14 md:py-18">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your Vault. Your Rules.{" "}
                <span className="text-primary">Zero Surprises.</span>
              </h2>
              <p className="mt-4 text-lg text-foreground/60">
                We&apos;re not a job board. Recruiters can never browse your profile.
              </p>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/15">
                  <Lock className="size-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Explicit Consent</h3>
                <p className="mt-2 text-sm text-foreground/70">
                  A recruiter only sees what you share. Nothing is ever visible by default.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/15">
                  <Timer className="size-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Expiring Access</h3>
                <p className="mt-2 text-sm text-foreground/70">
                  You set the timer — 7, 14, or 30 days. Access ends automatically.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/15">
                  <Trash2 className="size-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">No Data Hoarding</h3>
                <p className="mt-2 text-sm text-foreground/70">
                  If you delete your account, all recruiter access is killed instantly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Final CTA */}
      <FadeInOnScroll>
        <section className="px-4 py-14 md:py-18">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Claim Your Free Vault Now
            </h2>
            <p className="mt-4 text-foreground/60">
              No credit card. No catch. Your career data, your control.
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" className="gap-2 text-base px-8 py-6">
                  Create Your Free Vault <ArrowRight className="size-4" />
                </Button>
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
      <section className="px-4 py-14 md:py-18 lg:py-22">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Stop Chasing Nurses for{" "}
            <span className="text-primary">Checklists and References.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70 md:text-xl"
          >
            MyZipVault automates the healthcare compliance packet. Request a
            checklist, credentials, and references — and watch them complete in real
            time. No more endless email threads.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            <Link href="/agency-signup">
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                Get Started <ArrowRight className="size-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <FadeInOnScroll>
        <section className="border-t px-4 py-14 md:py-18">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-3 text-foreground/60">
                Request, track, and receive — in real time.
              </p>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {/* Step 1 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  1
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Send a Request</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  Request a checklist, credentials, and references from any nurse on the platform. One request, all documents.
                </p>
                <div className="absolute right-0 top-7 hidden h-px w-1/2 translate-x-1/2 bg-border sm:block" />
              </div>
              {/* Step 2 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  2
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Track in Real Time</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  See who opened your request, who is at 30% or 90%, and who has submitted. No more guessing or follow-up emails.
                </p>
                <div className="absolute right-0 top-7 hidden h-px w-1/2 translate-x-1/2 bg-border sm:block" />
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  3
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Access Verified Documents</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  Nurses share via expiring, HIPAA-aligned links. You get compliant, verified documents without storing sensitive data.
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* Features */}
      <section className="border-t px-4 py-14 md:py-18">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2">
            {/* Feature 1 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Eye className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Real-Time Tracking</h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    See exactly who opened your request, who&apos;s currently filling
                    it out at 30% or 50% or 90%, and who has submitted. No more
                    guessing.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Feature 2 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <FolderOpen className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Instant Document Access
                  </h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    Request a checklist and BLS. If the nurse shares their ACLS and
                    resume too, unlock each extra verified document for just 1
                    credit.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Feature 3 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <BadgeCheck className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Verified References</h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    When nurses request references from their managers, the manager
                    joins the vault. Next time you need a reference from that
                    manager, it&apos;s already verified.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Feature 4 */}
            <FadeInOnScroll>
              <div className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Handshake className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    HIPAA-Aligned Sharing
                  </h3>
                  <p className="mt-3 leading-relaxed text-foreground/65">
                    Candidates set expiring access links. You get compliant
                    verifiable documents without storing sensitive data in your own
                    inbox.
                  </p>
                </div>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FadeInOnScroll>
        <section className="border-t bg-muted/30 px-4 py-14 md:py-18">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get Started
            </h2>
            <p className="mt-4 text-foreground/60">
              Compliance packets that complete themselves.
            </p>
            <div className="mt-8">
              <Link href="/agency-signup">
                <Button size="lg" className="gap-2 text-base px-8 py-6">
                  Get Started <ArrowRight className="size-4" />
                </Button>
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
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              ZV
            </div>
            <span className="font-semibold text-lg">MyZipVault</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
        <div className="mt-8 flex flex-col items-center gap-4 border-t pt-6 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; 2025 MyZipVault. All rights reserved.
          </p>
          <Badge variant="outline" className="gap-1.5 py-1 text-xs">
            <ShieldCheck className="size-3.5 text-primary" />
            HIPAA-Aligned Security
          </Badge>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [view, setView] = useState<ViewMode>("candidate");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              ZV
            </div>
            <span className="font-semibold text-lg">MyZipVault</span>
          </div>
          <ViewToggle view={view} setView={setView} />
          <nav className="flex items-center gap-2">
            <Link href={view === "candidate" ? "/login" : "/agency-login"}>
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href={view === "candidate" ? "/signup" : "/agency-signup"}>
              <Button size="sm">Sign Up</Button>
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
