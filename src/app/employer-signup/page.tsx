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

const trustPoints = [
  "Post jobs directly to the marketplace",
  "Set your own commission budget",
  "Receive vetted candidates from our recruiter network",
];

const sharedLabelClass = "block text-xs font-bold uppercase";
const sharedLabelStyle = { color: "var(--text-secondary)", letterSpacing: "0.15em" } as const;

export default function EmployerSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-muted">Loading…</div>}>
      <EmployerSignupPageInner />
    </Suspense>
  );
}

function EmployerSignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = getPasswordChecks(password);
  const allPasswordChecks = checks.minLength && checks.uppercase && checks.lowercase && checks.number;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!companyName.trim()) newErrors.companyName = "Company name is required";

    if (!email) {
      newErrors.email = "Work email is required";
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
      const res = await fetch("/api/auth/employer-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim(),
          companyAddress: companyAddress.trim() || undefined,
          companyWebsite: companyWebsite.trim() || undefined,
          phone: phone.trim() || undefined,
          ref: refCode || undefined,
        }),
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

      <AuthSlideshowPanel
        tagline="For healthcare employers building their team."
        trustPoints={trustPoints}
        quoteCard={{
          text: "We posted our ICU RN opening on MyZipVault and had three vetted candidates within 48 hours. The commission transparency is a game-changer.",
          attribution: "Sarah K., Director of Talent at General Hospital",
        }}
        statsCard={[
          { value: "200+", label: "Employers" },
          { value: "10K+", label: "Candidates" },
          { value: "4.9", label: "Rating" },
        ]}
      />

      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10 overflow-y-auto">
        <div className="max-w-[460px] w-full relative my-8">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
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
              Employer Registration
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-[2.5rem] font-bold leading-[1.1] mb-2 text-foreground"
            style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
          >
            Hire faster.
          </h1>
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--primary)" }}
          >
            Employer Sign Up
          </p>
          <p
            className="text-base leading-relaxed mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Post jobs, set your commission budget, and receive vetted candidates from our recruiter network.
          </p>
          <div className="flex items-center gap-3 mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/signup" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Candidate & Professional Sign Up</Link>
            <span>·</span>
            <Link href="/agency-signup" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Recruiter & Agency Sign Up</Link>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className={sharedLabelClass} style={sharedLabelStyle}>
                  First Name
                </label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: "" }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!errors.firstName}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className={sharedLabelClass} style={sharedLabelStyle}>
                  Last Name
                </label>
                <Input
                  id="lastName"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: "" }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!errors.lastName}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="companyName" className={sharedLabelClass} style={sharedLabelStyle}>
                Company Name
              </label>
              <Input
                id="companyName"
                placeholder="General Hospital"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: "" }));
                }}
                disabled={isLoading}
                aria-invalid={!!errors.companyName}
              />
              {errors.companyName && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                  {errors.companyName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className={sharedLabelClass} style={sharedLabelStyle}>
                Work Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@hospital.com"
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
              <label htmlFor="password" className={sharedLabelClass} style={sharedLabelStyle}>
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
              <label htmlFor="confirmPassword" className={sharedLabelClass} style={sharedLabelStyle}>
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
              <label htmlFor="phone" className={sharedLabelClass} style={sharedLabelStyle}>
                Phone (optional)
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="companyWebsite" className={sharedLabelClass} style={sharedLabelStyle}>
                Company Website (optional)
              </label>
              <Input
                id="companyWebsite"
                placeholder="www.hospital.com"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                disabled={isLoading}
              />
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
                  Create Employer Account
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
            <Link href="/employer-signup" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Sign in
            </Link>
          </p>

          <p
            className="text-[0.9375rem] text-center mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Healthcare professional?{" "}
            <Link href="/signup" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Candidate Sign Up
            </Link>
          </p>

          <p
            className="text-[0.9375rem] text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Staffing agency or recruiter?{" "}
            <Link href="/agency-signup" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Recruiter Sign Up
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
