"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, X, ArrowRight, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

const trustPoints = [
  "HIPAA-aligned security architecture",
  "You control who sees your credentials",
  "Free forever for healthcare professionals",
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = getPasswordChecks(password);
  const allPasswordChecks = checks.minLength && checks.uppercase && checks.lowercase && checks.number;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!allPasswordChecks) {
      newErrors.password = "Password does not meet all requirements";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!tosAccepted) {
      newErrors.tos = "You must accept the Terms & Conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Sign up failed", { description: data.error || "Failed to create account" });
        return;
      }

      // Redirect to verify-email page so user knows to check their inbox
      toast.success("Account created!", {
        description: "Please check your email to verify your account.",
      });
      router.push(`/verify-email?email=${encodeURIComponent(email)}&signup=true`);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Shared input style
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

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--editorial-cream)" }}
    >
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Your healthcare career, organized and secure."
        trustPoints={trustPoints}
        quoteCard={{
          text: "No more filling out the same checklist for every assignment. MyZipVault changed how I manage my credentials.",
          attribution: "Maria L., Med-Surg RN",
        }}
        statsCard={[
          { value: "10K+", label: "Professionals" },
          { value: "30+", label: "Specialties" },
          { value: "4.9", label: "Rating" },
        ]}
      />

      {/* Right Panel - Form */}
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
              Sign Up
            </span>
          </div>

          {/* Heading */}
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
            Build your vault.
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--editorial-ink-soft)",
              marginBottom: "2.5rem",
            }}
          >
            Join MyZipVault as a healthcare professional. Free forever.
          </p>

          {/* Form */}
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
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
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

            <div className="space-y-2">
              <Label htmlFor="password" style={labelStyle}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                disabled={isLoading}
                style={inputStyle(!!errors.password)}
                autoComplete="new-password"
              />
              {errors.password && !allPasswordChecks && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger)", marginTop: "0.25rem" }}>
                  {errors.password}
                </p>
              )}
              {/* Password requirements */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", paddingTop: "0.5rem" }}>
                <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                <PasswordCheck label="One number" met={checks.number} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" style={labelStyle}>
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                disabled={isLoading}
                style={inputStyle(!!errors.confirmPassword)}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger)", marginTop: "0.25rem" }}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <Checkbox
                  id="tos"
                  checked={tosAccepted}
                  onCheckedChange={(checked) => {
                    setTosAccepted(checked === true);
                    if (errors.tos) setErrors((prev) => ({ ...prev, tos: "" }));
                  }}
                  disabled={isLoading}
                  style={{ marginTop: "0.125rem" }}
                />
                <Label
                  htmlFor="tos"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: "var(--editorial-ink-soft)",
                  }}
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    style={{
                      color: "var(--editorial-navy)",
                      fontWeight: 500,
                      textDecoration: "none",
                      borderBottom: "1px solid var(--editorial-gold)",
                      paddingBottom: "1px",
                    }}
                  >
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    style={{
                      color: "var(--editorial-navy)",
                      fontWeight: 500,
                      textDecoration: "none",
                      borderBottom: "1px solid var(--editorial-gold)",
                      paddingBottom: "1px",
                    }}
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.tos && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger)", marginTop: "0.25rem" }}>
                  {errors.tos}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
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
              }}
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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              margin: "2rem 0",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--editorial-rule)" }} />
            <span
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--editorial-ink-muted)",
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--editorial-rule)" }} />
          </div>

          {/* Links */}
          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--editorial-ink-soft)",
              textAlign: "center",
              marginBottom: "0.75rem",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--editorial-navy)",
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "1px solid var(--editorial-gold)",
                paddingBottom: "1px",
              }}
            >
              Sign in
            </Link>
          </p>

          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--editorial-ink-soft)",
              textAlign: "center",
            }}
          >
            Staffing agency or recruiter?{" "}
            <Link
              href="/agency-signup"
              style={{
                color: "var(--editorial-navy)",
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "1px solid var(--editorial-gold)",
                paddingBottom: "1px",
              }}
            >
              Register here
            </Link>
          </p>

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
                <Icon
                  className="size-3.5"
                  style={{ color: "var(--editorial-gold-dark)" }}
                />
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

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
      {met ? (
        <Check
          className="size-3.5 shrink-0"
          style={{ color: "var(--editorial-success)" }}
        />
      ) : (
        <X
          className="size-3.5 shrink-0"
          style={{ color: "var(--editorial-ink-muted)" }}
        />
      )}
      <span
        style={{
          color: met ? "var(--editorial-success)" : "var(--editorial-ink-muted)",
          fontWeight: met ? 500 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}
