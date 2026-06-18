"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
            <h1
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "2.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
                marginBottom: "0.75rem",
              }}
            >
              Verifying your email
            </h1>
            <p
              style={{
                fontSize: "1rem",
                lineHeight: 1.6,
                color: "var(--editorial-ink-soft)",
                marginBottom: "2.5rem",
              }}
            >
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
            <h1
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "2.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
                marginBottom: "0.75rem",
              }}
            >
              Email verified!
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              Your email address has been successfully verified. You can now
              sign in to your account.
            </p>
            <Link href="/login">
              <Button style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--editorial-navy)", color: "var(--editorial-cream)", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--editorial-navy)", borderRadius: "2px" }}>
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
            <h1
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "2.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
                marginBottom: "0.75rem",
              }}
            >
              Verification failed
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              {errorMessage || "The verification link is invalid or has expired."}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setState("resend")}
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--editorial-navy)", color: "var(--editorial-cream)", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--editorial-navy)", borderRadius: "2px" }}
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
            <h1
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "2.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
                marginBottom: "0.75rem",
              }}
            >
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
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--editorial-navy)", color: "var(--editorial-cream)", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--editorial-navy)", borderRadius: "2px" }}
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
            <h1
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "2.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
                marginBottom: "0.75rem",
              }}
            >
              Check your email
            </h1>
            <p className="text-text-secondary text-base mt-2 mb-8">
              If an account with that email exists and is not yet verified,
              we&apos;ve sent a new verification link. Please check your inbox
              and spam folder.
            </p>
            <Link href="/login">
              <Button style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--editorial-navy)", color: "var(--editorial-cream)", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--editorial-navy)", borderRadius: "2px" }}>
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
            <h1
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "2.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
                marginBottom: "0.75rem",
              }}
            >
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
                <Button style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--editorial-navy)", color: "var(--editorial-cream)", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--editorial-navy)", borderRadius: "2px" }}>
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
            <h1
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "2.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--editorial-navy)",
                marginBottom: "0.75rem",
              }}
            >
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
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--editorial-navy)", color: "var(--editorial-cream)", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--editorial-navy)", borderRadius: "2px" }}
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
    <div
      className="min-h-screen flex"
      style={{ background: "var(--editorial-cream)" }}
    >
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Healthcare credential verification, simplified"
        trustPoints={trustPoints}
      />

      {/* Right Panel - Form */}
      <div
        className="flex-1 flex items-center justify-center p-8 md:p-12 relative"
        style={{ background: "var(--editorial-cream)" }}
      >

        <div
          className="max-w-[420px] w-full relative z-10">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                background: "var(--editorial-navy)",
                color: "var(--editorial-cream)",
                fontFamily: "var(--editorial-font-serif)",
                fontWeight: 700,
                fontSize: "1.5rem",
                borderRadius: "2px",
                marginBottom: "1rem",
              }}
            >
              M
            </div>
            <h2
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--editorial-navy)",
                letterSpacing: "-0.02em",
              }}
            >
              MyZipVault
            </h2>
          </div>

          {/* Glass card wrapping content */}
          <div style={{ width: "100%" }}>
            {renderRightContent()}
          </div>

          {/* Security badges */}
          <div
            style={{
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--editorial-rule-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <ShieldCheck className="size-3.5" style={{ color: "var(--editorial-gold-dark)" }} />
              <span style={{ fontSize: "0.6875rem", letterSpacing: "0.05em", color: "var(--editorial-ink-muted)" }}>HIPAA Aligned</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <Lock className="size-3.5" style={{ color: "var(--editorial-gold-dark)" }} />
              <span style={{ fontSize: "0.6875rem", letterSpacing: "0.05em", color: "var(--editorial-ink-muted)" }}>256-bit Encryption</span>
            </div>
          </div>
        </div>
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
