"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, Mail, ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

const trustPoints = [
  "HIPAA-Aligned Security",
  "You Control Access",
  "100% Free for Nurses",
];

type VerifyState = "idle" | "verifying" | "success" | "error" | "resend" | "resend_success" | "signup_success";

// Reusable spatial icon container
function SpatialIcon({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "error" | "amber" }) {
  const styles =
    variant === "error"
      ? {
          background: "rgba(184,64,64,0.1)",
          border: "0.5px solid rgba(184,64,64,0.3)",
        }
      : variant === "amber"
        ? {
            background: "var(--status-amber-bg)",
            border: "0.5px solid rgba(217,119,6,0.2)",
          }
        : {
            background: "var(--primary-light)",
            border: "0.5px solid var(--status-green-border)",
          };
  return (
    <div
      className="flex items-center justify-center size-16 mb-6 rounded-[20px]"
      style={{
        ...styles,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {children}
    </div>
  );
}

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
    const headingClass = "text-[2.5rem] font-bold leading-[1.1] mb-3 text-foreground";
    const headingStyle = { fontFamily: "'Lora', serif", letterSpacing: "-0.02em" } as const;
    const subTextClass = "text-base leading-relaxed mb-8";
    const subTextStyle = { color: "var(--text-secondary)" } as const;

    switch (state) {
      case "verifying":
        return (
          <>
            <SpatialIcon>
              <Loader2 className="size-8 animate-spin" style={{ color: "var(--primary)" }} />
            </SpatialIcon>
            <h1 className={headingClass} style={headingStyle}>
              Verifying your email
            </h1>
            <p className={subTextClass} style={subTextStyle}>
              Please wait while we verify your email address...
            </p>
          </>
        );

      case "success":
        return (
          <>
            <SpatialIcon>
              <Check className="size-8" style={{ color: "var(--primary)" }} />
            </SpatialIcon>
            <h1 className={headingClass} style={headingStyle}>
              Email verified!
            </h1>
            <p className={subTextClass} style={subTextStyle}>
              Your email address has been successfully verified. You can now
              sign in to your account.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/login">
                Sign In
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        );

      case "error":
        return (
          <>
            <SpatialIcon variant="error">
              <AlertCircle className="size-8" style={{ color: "var(--status-red)" }} />
            </SpatialIcon>
            <h1 className={headingClass} style={headingStyle}>
              Verification failed
            </h1>
            <p className={subTextClass} style={subTextStyle}>
              {errorMessage || "The verification link is invalid or has expired."}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setState("resend")}
                size="lg"
                className="w-full"
              >
                Resend Verification Email
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/login">
                  Back to Sign In
                </Link>
              </Button>
            </div>
          </>
        );

      case "resend":
      case "idle":
        return (
          <>
            <SpatialIcon>
              <Mail className="size-8" style={{ color: "var(--primary)" }} />
            </SpatialIcon>
            <h1 className={headingClass} style={headingStyle}>
              {state === "resend" ? "Resend verification" : "Verify your email"}
            </h1>
            <p className={subTextClass} style={subTextStyle}>
              Enter your email address and we&apos;ll send you a new verification link.
            </p>

            <form onSubmit={handleResendSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase"
                  style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
                >
                  Email
                </label>
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
                  aria-invalid={!!emailError}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{emailError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isResending}
                size="lg"
                className="w-full"
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
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                style={{ color: "var(--primary)" }}
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
            <SpatialIcon>
              <Mail className="size-8" style={{ color: "var(--primary)" }} />
            </SpatialIcon>
            <h1 className={headingClass} style={headingStyle}>
              Check your email
            </h1>
            <p className={subTextClass} style={subTextStyle}>
              If an account with that email exists and is not yet verified,
              we&apos;ve sent a new verification link. Please check your inbox
              and spam folder.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/login">
                Back to Sign In
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        );

      case "signup_success":
        return (
          <>
            <SpatialIcon>
              <Mail className="size-8" style={{ color: "var(--primary)" }} />
            </SpatialIcon>
            <h1 className={headingClass} style={headingStyle}>
              Check your email
            </h1>
            <p className="text-base mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              We&apos;ve sent a verification link to{emailParam ? <strong className="text-foreground"> {emailParam}</strong> : " your email address"}. Please check your inbox and spam folder.
            </p>
            {/* Alert callout — spatial */}
            <div
              className="rounded-[16px] p-4 mb-8"
              style={{
                background: "var(--material-thin-bg)",
                backdropFilter: "blur(20px) saturate(1.5)",
                WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                border: "0.5px solid var(--material-thin-border)",
                boxShadow: "var(--specular-top), var(--depth-1)",
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Click the link in the email to verify your account, then sign in. The link expires in 24 hours.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => setState("resend")}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Resend Verification Email
              </Button>
              <Button asChild size="lg" className="w-full">
                <Link href="/login">
                  Back to Sign In
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex relative">
      <div className="mesh-background" />

      <AuthSlideshowPanel
        tagline="Healthcare credential verification, simplified"
        trustPoints={trustPoints}
      />

      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="max-w-[460px] w-full relative">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="inline-flex items-center justify-center size-12 mb-3 rounded-[12px] text-white text-2xl font-bold"
              style={{
                background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(201,123,84,0.32)",
                fontFamily: "'Lora', serif",
              }}
            >
              M
            </div>
            <h2
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
            >
              MyZipVault
            </h2>
          </div>

          {renderRightContent()}

          {/* Security badges */}
          <div className="mt-10 pt-6 flex items-center justify-center gap-6 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" style={{ color: "var(--terra)" }} />
              <span className="text-[0.6875rem] font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>HIPAA Aligned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="size-3.5" style={{ color: "var(--terra)" }} />
              <span className="text-[0.6875rem] font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>256-bit Encryption</span>
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
        <div className="min-h-screen flex items-center justify-center bg-background relative">
          <div className="mesh-background" />
          <Loader2 className="size-8 animate-spin text-primary relative z-10" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
