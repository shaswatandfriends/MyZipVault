"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Briefcase, User, Check, X, ArrowRight, Clock, ShieldCheck, Zap } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

type AccountType = "agency" | "recruiter";

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
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

const trustPoints = [
  "Real-Time Tracking",
  "Credit-Based Pricing",
  "HIPAA-Aligned",
];

export default function AgencySignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("agency");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = getPasswordChecks(password);
  const allPasswordChecks =
    checks.minLength && checks.uppercase && checks.lowercase && checks.number;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";

    if (accountType === "agency" && !agencyName.trim()) {
      newErrors.agencyName = "Agency name is required";
    }

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
      const res = await fetch("/api/auth/agency-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          accountType,
          agencyName: accountType === "agency" ? agencyName.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Sign up failed", {
          description: data.error || "Failed to create account",
        });
        return;
      }

      setIsSuccess(true);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state: pending approval ──
  if (isSuccess) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel - Slideshow */}
        <AuthSlideshowPanel
          tagline="For staffing agencies & healthcare recruiters"
          trustPoints={trustPoints}
          quoteCard={{
            text: "MyZipVault cut our credential verification time by 70%. Onboarding nurses is finally seamless.",
            attribution: "David R., VP of Operations at MedStaff Pro",
          }}
          statsCard={[
            { value: "500+", label: "Agencies" },
            { value: "50K+", label: "Placements" },
            { value: "4.8", label: "Rating" },
          ]}
        />

        {/* Right Panel - Success */}
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

            <div className="glass-card-static p-8 rounded-[var(--radius-xl)]">
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center justify-center size-16 bg-amber-100 rounded-2xl">
                  <Clock className="size-8 text-amber-600" />
                </div>
              </div>

              <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight text-center">
                Registration Submitted!
              </h1>
              <p className="text-text-secondary text-base mt-2 mb-8 text-center">
                Your account is pending admin approval
              </p>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6">
                <p className="text-sm text-amber-800 leading-relaxed">
                  Thank you for registering{accountType === "agency" ? ` ${agencyName}` : ""}! Our team will review your application and approve your account shortly. You&apos;ll receive an email once your account is activated.
                </p>
              </div>

              <div className="space-y-2.5 text-sm text-text-secondary mb-8">
                <p className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  Approval typically takes 1-2 business days
                </p>
                <p className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  You&apos;ll be notified via email once approved
                </p>
                <p className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  Contact support if you have any questions
                </p>
              </div>

              <div className="space-y-3">
                <Link href="/agency-login" className="block">
                  <Button variant="outline" className="w-full rounded-xl py-3 border-border">
                    Go to Agency Login
                  </Button>
                </Link>
                <Link href="/" className="block">
                  <Button variant="ghost" className="w-full rounded-xl py-3 text-text-secondary">
                    Back to Homepage
                  </Button>
                </Link>
              </div>
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

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="For staffing agencies & healthcare recruiters"
        trustPoints={trustPoints}
        quoteCard={{
          text: "MyZipVault cut our credential verification time by 70%. Onboarding nurses is finally seamless.",
          attribution: "David R., VP of Operations at MedStaff Pro",
        }}
        statsCard={[
          { value: "500+", label: "Agencies" },
          { value: "50K+", label: "Placements" },
          { value: "4.8", label: "Rating" },
        ]}
      />

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-background relative overflow-y-auto">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-light/20 to-transparent" />
        <div className="absolute top-20 right-10 size-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-10 size-48 rounded-full bg-accent-teal/5 blur-3xl" />

        <motion.div
          className="max-w-[420px] w-full relative z-10 my-8"
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
                Join MyZipVault
              </h1>
              <p className="text-text-secondary text-base mt-2">
                For staffing agencies & healthcare recruiters
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account Type Toggle */}
              <div className="flex rounded-xl bg-surface border border-border p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAccountType("agency")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    accountType === "agency"
                      ? "bg-primary-light text-primary shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  <Briefcase className="size-3.5" />
                  Staffing Agency
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("recruiter")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    accountType === "recruiter"
                      ? "bg-primary-light text-primary shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  <User className="size-3.5" />
                  Individual Recruiter
                </button>
              </div>

              {/* Name Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName)
                        setErrors((prev) => ({ ...prev, firstName: "" }));
                    }}
                    disabled={isLoading}
                    className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.firstName ? "border-destructive" : ""}`}
                    autoComplete="given-name"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errors.lastName)
                        setErrors((prev) => ({ ...prev, lastName: "" }));
                    }}
                    disabled={isLoading}
                    className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.lastName ? "border-destructive" : ""}`}
                    autoComplete="family-name"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Agency Name (only for agency) */}
              {accountType === "agency" && (
                <div className="space-y-2">
                  <Label htmlFor="agencyName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Agency / Organization Name
                  </Label>
                  <Input
                    id="agencyName"
                    type="text"
                    placeholder="Acme Healthcare Staffing"
                    value={agencyName}
                    onChange={(e) => {
                      setAgencyName(e.target.value);
                      if (errors.agencyName)
                        setErrors((prev) => ({ ...prev, agencyName: "" }));
                    }}
                    disabled={isLoading}
                    className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.agencyName ? "border-destructive" : ""}`}
                    autoComplete="organization"
                  />
                  {errors.agencyName && (
                    <p className="text-xs text-destructive">
                      {errors.agencyName}
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Work Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@agency.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email)
                      setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  disabled={isLoading}
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.email ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password */}
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
                    if (errors.password)
                      setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  disabled={isLoading}
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.password ? "border-destructive" : ""}`}
                  autoComplete="new-password"
                />
                {errors.password && !allPasswordChecks && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                <div className="space-y-1.5 pt-1">
                  <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                  <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                  <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                  <PasswordCheck label="One number" met={checks.number} />
                </div>
              </div>

              {/* Confirm Password */}
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
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  disabled={isLoading}
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.confirmPassword ? "border-destructive" : ""}`}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* TOS */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="tos"
                    checked={tosAccepted}
                    onCheckedChange={(checked) => {
                      setTosAccepted(checked === true);
                      if (errors.tos)
                        setErrors((prev) => ({ ...prev, tos: "" }));
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
                    Submit Application <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-sm text-text-secondary text-center mt-6">
              Already have an account?{" "}
              <Link href="/agency-login" className="text-primary hover:text-primary-hover font-semibold transition-colors">
                Sign in
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
