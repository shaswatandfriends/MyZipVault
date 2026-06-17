"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowRight, ArrowLeft, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

const trustPoints = [
  "HIPAA-aligned security architecture",
  "You control who sees your credentials",
  "Free forever for healthcare professionals",
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
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

      setIsSubmitted(true);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    background: "var(--editorial-paper)",
    border: `1px solid ${hasError ? "var(--editorial-danger)" : "var(--editorial-rule)"}`,
    borderRadius: "2px",
    height: "48px",
    color: "var(--editorial-ink)",
    fontSize: "0.9375rem",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--editorial-ink-soft)",
  };

  const buttonStyle = (isLoading: boolean): React.CSSProperties => ({
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "1rem 1.5rem",
    background: "var(--editorial-navy)",
    color: "var(--editorial-cream)",
    fontSize: "0.875rem",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    border: "1px solid var(--editorial-navy)",
    borderRadius: "2px",
    cursor: isLoading ? "not-allowed" : "pointer",
    opacity: isLoading ? 0.7 : 1,
    transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
    textDecoration: "none",
  });

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--editorial-cream)" }}
    >
      <AuthSlideshowPanel
        tagline="Your credentials. Your terms."
        trustPoints={trustPoints}
      />

      <div
        className="flex-1 flex items-center justify-center p-8 md:p-12 relative"
        style={{ background: "var(--editorial-cream)" }}
      >
        <div className="max-w-[440px] w-full relative">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-10">
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

          {isSubmitted ? (
            <>
              {/* Eyebrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--editorial-gold-dark)",
                  }}
                >
                  Check Your Email
                </span>
              </div>

              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "var(--editorial-cream-cool)",
                  border: "1px solid var(--editorial-rule)",
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <Mail className="size-7" style={{ color: "var(--editorial-navy)" }} />
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
                Check your email.
              </h1>
              <p
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.6,
                  color: "var(--editorial-ink-soft)",
                  marginBottom: "2.5rem",
                }}
              >
                If an account with that email exists, we&apos;ve sent a reset link. Please check your inbox and spam folder.
              </p>

              <Link href="/login" style={buttonStyle(false)}>
                Back to Sign In
                <ArrowRight className="size-4" />
              </Link>
            </>
          ) : (
            <>
              {/* Eyebrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--editorial-gold-dark)",
                  }}
                >
                  Reset Password
                </span>
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
                Forgot password?
              </h1>
              <p
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.6,
                  color: "var(--editorial-ink-soft)",
                  marginBottom: "2.5rem",
                }}
              >
                No worries — we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" style={labelStyle}>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    disabled={isLoading}
                    style={inputStyle(!!errors.email)}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger)", marginTop: "0.25rem" }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={buttonStyle(isLoading)}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.background = "var(--editorial-navy-light)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) e.currentTarget.style.background = "var(--editorial-navy)";
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>

              <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                <Link
                  href="/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.875rem",
                    color: "var(--editorial-ink-soft)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  <ArrowLeft className="size-4" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}

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
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Icon className="size-3.5" style={{ color: "var(--editorial-gold-dark)" }} />
                <span
                  style={{
                    fontSize: "0.6875rem",
                    letterSpacing: "0.05em",
                    color: "var(--editorial-ink-muted)",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
