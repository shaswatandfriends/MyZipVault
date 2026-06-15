"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Check, X, ArrowRight, ShieldCheck, Zap } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  "HIPAA-Aligned Security",
  "You Control Access",
  "100% Free for Nurses",
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

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Your healthcare career, organized and secure"
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

          {/* Glass card wrapping form */}
          <div className="glass-card-static p-8 rounded-[var(--radius-xl)]">
            <div className="mb-8">
              <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                Create your account
              </h1>
              <p className="text-text-secondary text-base mt-2">
                Join MyZipVault as a healthcare candidate
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Email
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
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.email ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
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
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.password ? "border-destructive" : ""}`}
                  autoComplete="new-password"
                />
                {errors.password && !allPasswordChecks && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                {/* Password requirements */}
                <div className="space-y-1.5 pt-1">
                  <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                  <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                  <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                  <PasswordCheck label="One number" met={checks.number} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
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
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.confirmPassword ? "border-destructive" : ""}`}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
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
                  <Label htmlFor="tos" className="text-sm font-normal leading-snug text-text-secondary">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary hover:text-primary-hover font-medium transition-colors">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:text-primary-hover font-medium transition-colors">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.tos && (
                  <p className="text-xs text-destructive">{errors.tos}</p>
                )}
              </div>

              <Button
                type="submit"
                className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                disabled={isLoading}
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-3 text-text-muted">or</span>
              </div>
            </div>

            <p className="text-sm text-text-secondary text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary-hover font-semibold transition-colors">
                Sign in
              </Link>
            </p>

            <p className="text-sm text-text-secondary text-center mt-3">
              Staffing agency or recruiter?{" "}
              <Link href="/agency-signup" className="text-primary hover:text-primary-hover font-semibold transition-colors">
                Register here
              </Link>
            </p>
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

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="size-3.5 text-primary shrink-0" />
      ) : (
        <X className="size-3.5 text-text-muted shrink-0" />
      )}
      <span className={met ? "text-primary font-medium" : "text-text-muted"}>
        {label}
      </span>
    </div>
  );
}
