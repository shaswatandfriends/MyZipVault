"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Briefcase, User, Check, X, ArrowRight, Clock } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
        <Check className="size-3.5 text-[#166534] shrink-0" />
      ) : (
        <X className="size-3.5 text-[#9CA3AF] shrink-0" />
      )}
      <span className={met ? "text-[#166534]" : "text-[#9CA3AF]"}>
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
        {/* Left Panel - Decorative */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
              <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-4xl font-bold">ZV</span>
            </div>
            <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[28px] font-bold text-white mt-4">MyZipVault</h2>
            <p className="text-white/75 text-base mt-2" style={{ fontFamily: "Inter, sans-serif" }}>For staffing agencies & healthcare recruiters</p>
            <div className="mt-12 space-y-4">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-center justify-center gap-3 text-white/70 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                  <Check className="size-4 shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Success */}
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4]">
          <div className="max-w-[400px] w-full">
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#166534] rounded-2xl mb-3">
                <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-2xl font-bold">ZV</span>
              </div>
              <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-2xl font-bold text-[#111827]">MyZipVault</h2>
            </div>

            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl">
                <Clock className="size-8 text-amber-600" />
              </div>
            </div>

            <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight text-center">
              Registration Submitted!
            </h1>
            <p className="text-[#6B7280] text-base mt-2 mb-8 text-center">
              Your account is pending admin approval
            </p>

            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 space-y-5">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800 leading-relaxed">
                  Thank you for registering{accountType === "agency" ? ` ${agencyName}` : ""}! Our team will review your application and approve your account shortly. You&apos;ll receive an email once your account is activated.
                </p>
              </div>
              <div className="space-y-2.5 text-sm text-[#6B7280]">
                <p className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-[#166534] shrink-0" />
                  Approval typically takes 1-2 business days
                </p>
                <p className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-[#166534] shrink-0" />
                  You&apos;ll be notified via email once approved
                </p>
                <p className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-[#166534] shrink-0" />
                  Contact support if you have any questions
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link href="/agency-login" className="block">
                <Button variant="outline" className="w-full rounded-xl py-3 border-[#E5E7EB]">
                  Go to Agency Login
                </Button>
              </Link>
              <Link href="/" className="block">
                <Button variant="ghost" className="w-full rounded-xl py-3 text-[#6B7280]">
                  Back to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
            <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-4xl font-bold">ZV</span>
          </div>
          <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[28px] font-bold text-white mt-4">MyZipVault</h2>
          <p className="text-white/75 text-base mt-2" style={{ fontFamily: "Inter, sans-serif" }}>For staffing agencies & healthcare recruiters</p>
          <div className="mt-12 space-y-4">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center justify-center gap-3 text-white/70 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                <Check className="size-4 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4] overflow-y-auto">
        <div className="max-w-[400px] w-full my-8">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#166534] rounded-2xl mb-3">
              <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-2xl font-bold">ZV</span>
            </div>
            <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-2xl font-bold text-[#111827]">MyZipVault</h2>
          </div>

          <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
            Join MyZipVault
          </h1>
          <p className="text-[#6B7280] text-base mt-2 mb-8">
            For staffing agencies & healthcare recruiters
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Type Toggle */}
            <div className="flex rounded-xl bg-white border border-[#E5E7EB] p-1 gap-1">
              <button
                type="button"
                onClick={() => setAccountType("agency")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  accountType === "agency"
                    ? "bg-[#DCFCE7] text-[#166534] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
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
                    ? "bg-[#DCFCE7] text-[#166534] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                <User className="size-3.5" />
                Individual Recruiter
              </button>
            </div>

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
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
                  className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.firstName ? "border-destructive" : ""}`}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
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
                  className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.lastName ? "border-destructive" : ""}`}
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
              <div className="space-y-1.5">
                <Label htmlFor="agencyName" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
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
                  className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.agencyName ? "border-destructive" : ""}`}
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
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
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
                className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.email ? "border-destructive" : ""}`}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
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
                className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.password ? "border-destructive" : ""}`}
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
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
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
                className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.confirmPassword ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* TOS */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
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
                <Label htmlFor="tos" className="text-sm font-normal leading-snug text-[#6B7280]">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#166534] hover:underline cursor-pointer">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#166534] hover:underline cursor-pointer">
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
              className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all gap-2"
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

          <p className="text-sm text-[#6B7280] text-center mt-6">
            Already have an account?{" "}
            <Link href="/agency-login" className="text-[#0D9488] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
