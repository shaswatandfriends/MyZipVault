"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Check, Mail, ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, Zap } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

const trustPoints = [
  "HIPAA-Aligned Security",
  "You Control Access",
  "100% Free for Nurses",
];

type VerifyState = "idle" | "verifying" | "success" | "error" | "resend" | "resend_success" | "signup_success";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const isSignup = searchParams.get("signup") === "true";

  const [state, setState] = useState<VerifyState>(
    token ? "verifying" : isSignup ? "signup_success" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState(emailParam || "");
  const [emailError, setEmailError] = useState("");
  const [isResending, setIsResending] = useState(false);

  // Auto-submit verification if token is present
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setState("success");
        } else {
          setErrorMessage(data.error || "Verification failed. The link may be invalid or expired.");
          setState("error");
        }
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setState("error");
      }
    };

    verifyToken();
  }, [token]);

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setEmailError("Email is required");
      return;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsResending(true);

    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Error", {
          description: data.error || "Something went wrong. Please try again.",
        });
        return;
      }

      setState("resend_success");
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const renderRightContent = () => {
    switch (state) {
      case "verifying":
        return (
          <>
            <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
            <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
              Verifying your email
            </h1>
            <p className="text-text-secondary text-base mt-2">
              Please wait while we verify your email address...
            </p>
          </>
        );

      case "success":
        return (
          <>
            <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
              <Check className="size-8 text-primary" />
            </div>
            <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
              Email verified!
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              Your email address has been successfully verified. You can now
              sign in to your account.
            </p>
            <Link href="/login">
              <Button className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base">
                Sign In
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </>
        );

      case "error":
        return (
          <>
            <div className="flex items-center justify-center size-16 bg-red-50 rounded-2xl mb-6">
              <AlertCircle className="size-8 text-red-600" />
            </div>
            <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
              Verification failed
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              {errorMessage || "The verification link is invalid or has expired."}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setState("resend")}
                className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
              >
                Resend Verification Email
              </Button>
              <Link href="/login" className="block">
                <Button
                  variant="outline"
                  className="w-full py-3.5 rounded-xl font-medium border-border transition-all"
                >
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </>
        );

      case "resend":
        return (
          <>
            <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
              <Mail className="size-8 text-primary" />
            </div>
            <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
              Resend verification
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              Enter your email address and we&apos;ll send you a new verification link.
            </p>

            <form onSubmit={handleResendSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  disabled={isResending}
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                    emailError ? "border-destructive" : ""
                  }`}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending verification...
                  </>
                ) : (
                  <>
                    Send Verification Link
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
              >
                <ArrowLeft className="size-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        );

      case "resend_success":
        return (
          <>
            <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
              <Mail className="size-8 text-primary" />
            </div>
            <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
              Check your email
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              If an account with that email exists and is not yet verified,
              we&apos;ve sent a new verification link. Please check your inbox
              and spam folder.
            </p>
            <Link href="/login">
              <Button className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base">
                Back to Sign In
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </>
        );

      case "signup_success":
        return (
          <>
            <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
              <Mail className="size-8 text-primary" />
            </div>
            <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
              Check your email
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-4">
              We&apos;ve sent a verification link to{emailParam ? <strong className="text-foreground"> {emailParam}</strong> : " your email address"}. Please check your inbox and spam folder.
            </p>
            <div className="rounded-xl bg-surface border border-border p-4 mb-8">
              <p className="text-sm text-text-secondary leading-relaxed">
                Click the link in the email to verify your account, then sign in. The link expires in 24 hours.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => setState("resend")}
                variant="outline"
                className="w-full py-3.5 rounded-xl font-medium border-border transition-all"
              >
                Resend Verification Email
              </Button>
              <Link href="/login" className="block">
                <Button className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base">
                  Back to Sign In
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </>
        );

      default:
        // idle - no token, show resend form
        return (
          <>
            <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
              <Mail className="size-8 text-primary" />
            </div>
            <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
              Verify your email
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              Enter your email address to receive a verification link.
            </p>

            <form onSubmit={handleResendSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  disabled={isResending}
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                    emailError ? "border-destructive" : ""
                  }`}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending verification...
                  </>
                ) : (
                  <>
                    Send Verification Link
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
              >
                <ArrowLeft className="size-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Healthcare credential verification, simplified"
        trustPoints={trustPoints}
      />

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-background relative">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-light/20 to-transparent" />
        <div className="absolute top-20 right-10 size-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-10 size-48 rounded-full bg-accent-teal/5 blur-3xl" />

        <motion.div
          className="max-w-[420px] w-full relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl btn-gradient mb-3 shadow-glow">
              <span className="text-white text-2xl font-bold font-heading">ZV</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground font-heading tracking-tight">MyZipVault</h2>
          </div>

          {/* Glass card wrapping content */}
          <div className="glass-card-static p-8 rounded-[var(--radius-xl)]">
            {renderRightContent()}
          </div>

          {/* Security badges */}
          <div className="mt-6 flex items-center justify-center gap-5">
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-medium">
              <ShieldCheck className="size-3" /> HIPAA
            </div>
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-medium">
              <Zap className="size-3" /> 256-bit
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
