"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Briefcase, User, Check, X, ArrowRight, Clock, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
  "Real-Time Tracking",
  "Credit-Based Pricing",
  "HIPAA-Aligned",
];

const sharedLabelClass = "block text-xs font-bold uppercase";
const sharedLabelStyle = { color: "var(--text-secondary)", letterSpacing: "0.15em" } as const;

export default function AgencySignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-muted">Loading…</div>}>
      <AgencySignupPageInner />
    </Suspense>
  );
}

function AgencySignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
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
          ref: refCode || undefined,
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
      <div className="min-h-screen flex relative">
        <div className="mesh-background" />

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

        <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
          <div className="max-w-[460px] w-full relative">
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

            {/* Clock icon — spatial circle */}
            <div className="flex justify-center mb-6">
              <div
                className="flex items-center justify-center size-16 rounded-[20px]"
                style={{
                  background: "var(--status-amber-bg)",
                  border: "0.5px solid rgba(217,119,6,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <Clock className="size-8" style={{ color: "var(--status-amber)" }} />
              </div>
            </div>

            <h1
              className="text-[2.5rem] font-bold leading-[1.1] mb-3 text-center text-foreground"
              style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
            >
              Registration Submitted!
            </h1>
            <p className="text-base mb-8 text-center" style={{ color: "var(--text-secondary)" }}>
              Your account is pending admin approval
            </p>

            {/* Alert callout — spatial */}
            <div
              className="rounded-[16px] p-4 mb-6"
              style={{
                background: "var(--status-amber-bg)",
                border: "0.5px solid rgba(217,119,6,0.25)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "var(--status-amber-dark)" }}>
                Thank you for registering{accountType === "agency" ? ` ${agencyName}` : ""}! Our team will review your application and approve your account shortly. You&apos;ll receive an email once your account is activated.
              </p>
            </div>

            <div className="space-y-2.5 text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
              <p className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full shrink-0" style={{ background: "var(--primary)" }} />
                Approval typically takes 1-2 business days
              </p>
              <p className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full shrink-0" style={{ background: "var(--primary)" }} />
                You&apos;ll be notified via email once approved
              </p>
              <p className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full shrink-0" style={{ background: "var(--primary)" }} />
                Contact support if you have any questions
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/agency-login">
                  Go to Agency Login
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="w-full">
                <Link href="/">
                  Back to Homepage
                </Link>
              </Button>
            </div>

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

  return (
    <div className="min-h-screen flex relative">
      <div className="mesh-background" />

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
              Agency Registration
            </span>
          </div>

          <h1
            className="text-[2.5rem] font-bold leading-[1.1] mb-2 text-foreground"
            style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
          >
            Join MyZipVault
          </h1>
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--primary)" }}
          >
            Recruiter & Agency Sign Up
          </p>
          <p
            className="text-base leading-relaxed mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            For staffing agencies & healthcare recruiters
          </p>
          <div className="flex items-center gap-3 mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/signup" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Candidate & Professional Sign Up</Link>
            <span>·</span>
            <Link href="/employer-signup" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Employer Sign Up</Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Type Toggle — spatial pill segment */}
            <div
              className="flex p-1 gap-1 rounded-full"
              style={{
                background: "var(--material-thin-bg)",
                backdropFilter: "blur(20px) saturate(1.5)",
                WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                border: "0.5px solid var(--material-thin-border)",
                boxShadow: "var(--specular-top), var(--depth-1)",
              }}
            >
              <button
                type="button"
                onClick={() => setAccountType("agency")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all"
                style={
                  accountType === "agency"
                    ? {
                        background: "linear-gradient(180deg, var(--primary-vivid) 0%, var(--primary) 100%)",
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(45,90,61,0.24)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                <Briefcase className="size-3.5" />
                Staffing Agency
              </button>
              <button
                type="button"
                onClick={() => setAccountType("recruiter")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all"
                style={
                  accountType === "recruiter"
                    ? {
                        background: "linear-gradient(180deg, var(--primary-vivid) 0%, var(--primary) 100%)",
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(45,90,61,0.24)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                <User className="size-3.5" />
                Individual Recruiter
              </button>
            </div>

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="firstName" className={sharedLabelClass} style={sharedLabelStyle}>
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
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
                  <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className={sharedLabelClass} style={sharedLabelStyle}>
                  Last Name
                </label>
                <Input
                  id="lastName"
                  type="text"
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
                  <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Agency Name (only for agency) */}
            {accountType === "agency" && (
              <div className="space-y-2">
                <label htmlFor="agencyName" className={sharedLabelClass} style={sharedLabelStyle}>
                  Agency / Organization Name
                </label>
                <Input
                  id="agencyName"
                  type="text"
                  placeholder="Acme Healthcare Staffing"
                  value={agencyName}
                  onChange={(e) => {
                    setAgencyName(e.target.value);
                    if (errors.agencyName) setErrors((prev) => ({ ...prev, agencyName: "" }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!errors.agencyName}
                  autoComplete="organization"
                />
                {errors.agencyName && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.agencyName}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className={sharedLabelClass} style={sharedLabelStyle}>
                Work Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@agency.com"
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
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.email}</p>
              )}
            </div>

            {/* Password */}
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
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.password}</p>
              )}
              <div className="flex flex-col gap-1.5 pt-2">
                <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                <PasswordCheck label="One number" met={checks.number} />
              </div>
            </div>

            {/* Confirm Password */}
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
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.confirmPassword}</p>
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
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.tos}</p>
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
                  Submit Application
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link href="/agency-login" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Sign in
            </Link>
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
