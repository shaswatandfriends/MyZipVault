"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, X, ArrowRight, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-muted">Loading…</div>}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
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
        body: JSON.stringify({ email, password, ref: refCode || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Sign up failed", { description: data.error || "Failed to create account" });
        return;
      }

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

  return (
    <div className="min-h-screen flex relative">
      <div className="mesh-background" />

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

      {/* Right Panel - Spatial Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="max-w-[460px] w-full relative">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-10">
            <div
              className="inline-flex items-center justify-center size-12 mb-3 rounded-[12px] text-white text-2xl font-bold"
              style={{
                background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
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

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }} />
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "var(--terra)", letterSpacing: "0.2em" }}
            >
              Sign Up
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-[2.5rem] font-bold leading-[1.1] mb-2 text-foreground"
            style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
          >
            Build your vault.
          </h1>
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--primary)" }}
          >
            Candidate & Professional Sign Up
          </p>
          <p
            className="text-base leading-relaxed mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Join MyZipVault as a healthcare professional. Free forever.
          </p>
          <div className="flex items-center gap-3 mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/agency-signup" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Recruiter & Agency Sign Up</Link>
            <span>·</span>
            <Link href="/employer-signup" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Employer Sign Up</Link>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase"
                style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
              >
                Email Address
              </label>
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
                aria-invalid={!!errors.email}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase"
                style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
              >
                Password
              </label>
              <PasswordInput
                id="password"

                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                disabled={isLoading}
                aria-invalid={!!errors.password && !allPasswordChecks}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
              {errors.password && !allPasswordChecks && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                  {errors.password}
                </p>
              )}
              {/* Password requirements */}
              <div className="flex flex-col gap-1.5 pt-2">
                <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                <PasswordCheck label="One number" met={checks.number} />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold uppercase"
                style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
              >
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"

                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                disabled={isLoading}
                aria-invalid={!!errors.confirmPassword}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
              {errors.confirmPassword && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="tos"
                  checked={tosAccepted}
                  onCheckedChange={(checked) => {
                    setTosAccepted(checked === true);
                    if (errors.tos) setErrors((prev) => ({ ...prev, tos: "" }));
                  }}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <label
                  htmlFor="tos"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  I agree to the{" "}
                  <Link href="/terms" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.tos && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                  {errors.tos}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full"
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
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border-strong), transparent)" }} />
            <span
              className="text-[0.6875rem] uppercase font-semibold"
              style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
            >
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border-strong), transparent)" }} />
          </div>

          {/* Links */}
          <p
            className="text-[0.9375rem] text-center mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Already have an account?{" "}
            <Link href="/login" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Sign in
            </Link>
          </p>

          <p
            className="text-[0.9375rem] text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Staffing agency or recruiter?{" "}
            <Link href="/agency-signup" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Register here
            </Link>
          </p>

          <p
            className="text-[0.9375rem] text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Healthcare employer?{" "}
            <Link href="/employer-signup" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Employer Sign Up
            </Link>
          </p>

          <p
            className="text-xs text-center mt-2"
            style={{ color: "var(--text-muted)" }}
          >
            Candidate · Recruiter · Employer — pick your side
          </p>

          {/* Security badges */}
          <div className="mt-10 pt-6 flex items-center justify-center gap-6 border-t" style={{ borderColor: "var(--border)" }}>
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="size-3.5" style={{ color: "var(--terra)" }} />
                <span
                  className="text-[0.6875rem] font-medium"
                  style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
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
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="size-3.5 shrink-0" style={{ color: "var(--primary)" }} />
      ) : (
        <X className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
      )}
      <span
        className={met ? "font-medium" : "font-normal"}
        style={{ color: met ? "var(--primary)" : "var(--text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}
