"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, Mail, ArrowLeft, AlertCircle } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
            <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
              <Loader2 className="size-8 text-[#166534] animate-spin" />
            </div>
            <h1
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-[36px] font-bold text-[#111827] leading-tight"
            >
              Verifying your email
            </h1>
            <p className="text-[#6B7280] text-base mt-2">
              Please wait while we verify your email address...
            </p>
          </>
        );

      case "success":
        return (
          <>
            <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
              <Check className="size-8 text-[#166534]" />
            </div>
            <h1
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-[36px] font-bold text-[#111827] leading-tight"
            >
              Email verified!
            </h1>
            <p className="text-[#6B7280] text-base mt-2 mb-8">
              Your email address has been successfully verified. You can now
              sign in to your account.
            </p>
            <Link href="/login">
              <Button className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all">
                Sign In
              </Button>
            </Link>
          </>
        );

      case "error":
        return (
          <>
            <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-6">
              <AlertCircle className="size-8 text-red-600" />
            </div>
            <h1
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-[36px] font-bold text-[#111827] leading-tight"
            >
              Verification failed
            </h1>
            <p className="text-[#6B7280] text-base mt-2 mb-8">
              {errorMessage || "The verification link is invalid or has expired."}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setState("resend")}
                className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
              >
                Resend Verification Email
              </Button>
              <Link href="/login" className="block">
                <Button
                  variant="outline"
                  className="w-full py-3.5 rounded-xl font-medium border-[#E5E7EB] hover:bg-[#F3F4F6] transition-all"
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
            <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
              <Mail className="size-8 text-[#166534]" />
            </div>
            <h1
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-[36px] font-bold text-[#111827] leading-tight"
            >
              Resend verification
            </h1>
            <p className="text-[#6B7280] text-base mt-2 mb-8">
              Enter your email address and we&apos;ll send you a new verification link.
            </p>

            <form onSubmit={handleResendSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-medium tracking-wide uppercase text-[#6B7280]"
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
                  className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${
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
                className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Sending verification...
                  </>
                ) : (
                  "Send Verification Link"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#0D9488] hover:underline font-medium"
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
            <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
              <Mail className="size-8 text-[#166534]" />
            </div>
            <h1
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-[36px] font-bold text-[#111827] leading-tight"
            >
              Check your email
            </h1>
            <p className="text-[#6B7280] text-base mt-2 mb-8">
              If an account with that email exists and is not yet verified,
              we&apos;ve sent a new verification link. Please check your inbox
              and spam folder.
            </p>
            <Link href="/login">
              <Button className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all">
                Back to Sign In
              </Button>
            </Link>
          </>
        );

      case "signup_success":
        return (
          <>
            <div className="flex items-center justify-center w-16 h-16 bg-[#CCFBF1] rounded-2xl mb-6">
              <Mail className="size-8 text-[#0D9488]" />
            </div>
            <h1
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-[36px] font-bold text-[#111827] leading-tight"
            >
              Check your email
            </h1>
            <p className="text-[#6B7280] text-base mt-2 mb-4">
              We&apos;ve sent a verification link to{emailParam ? <strong className="text-[#111827]"> {emailParam}</strong> : " your email address"}. Please check your inbox and spam folder.
            </p>
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 mb-8">
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Click the link in the email to verify your account, then sign in. The link expires in 24 hours.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => setState("resend")}
                variant="outline"
                className="w-full py-3.5 rounded-xl font-medium border-[#E5E7EB] hover:bg-[#F3F4F6] transition-all"
              >
                Resend Verification Email
              </Button>
              <Link href="/login" className="block">
                <Button className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </>
        );

      default:
        // idle - no token, show resend form
        return (
          <>
            <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
              <Mail className="size-8 text-[#166534]" />
            </div>
            <h1
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-[36px] font-bold text-[#111827] leading-tight"
            >
              Verify your email
            </h1>
            <p className="text-[#6B7280] text-base mt-2 mb-8">
              Enter your email address to receive a verification link.
            </p>

            <form onSubmit={handleResendSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-medium tracking-wide uppercase text-[#6B7280]"
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
                  className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${
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
                className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Sending verification...
                  </>
                ) : (
                  "Send Verification Link"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#0D9488] hover:underline font-medium"
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
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
            <span
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-white text-4xl font-bold"
            >
              ZV
            </span>
          </div>
          <h2
            style={{ fontFamily: "'Clash Display', sans-serif" }}
            className="text-[28px] font-bold text-white mt-4"
          >
            MyZipVault
          </h2>
          <p
            className="text-white/75 text-base mt-2"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Healthcare credential verification, simplified
          </p>
          <div className="mt-12 space-y-4">
            {trustPoints.map((point) => (
              <div
                key={point}
                className="flex items-center justify-center gap-3 text-white/70 text-sm"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <Check className="size-4 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4]">
        <div className="max-w-[400px] w-full">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#166534] rounded-2xl mb-3">
              <span
                style={{ fontFamily: "'Clash Display', sans-serif" }}
                className="text-white text-2xl font-bold"
              >
                ZV
              </span>
            </div>
            <h2
              style={{ fontFamily: "'Clash Display', sans-serif" }}
              className="text-2xl font-bold text-[#111827]"
            >
              MyZipVault
            </h2>
          </div>

          {renderRightContent()}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
          <Loader2 className="size-8 animate-spin text-[#166534]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
