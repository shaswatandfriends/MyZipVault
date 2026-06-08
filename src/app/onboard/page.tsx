"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, X, Mail, ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface TokenInfo {
  email: string;
  role: string;
  tokenType: string;
  agencyName?: string;
  facilityName?: string;
  nurseName?: string;
}

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
  "HIPAA-Aligned Security",
  "You Control Access",
  "100% Free for Nurses",
];

function OnboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [isValidating, setIsValidating] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = getPasswordChecks(password);
  const allPasswordChecks = checks.minLength && checks.uppercase && checks.lowercase && checks.number;

  useEffect(() => {
    if (!token) {
      setTokenError("No invite token provided. Please use the link from your invitation email.");
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/onboard?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setTokenError(data.error || "Invalid invite token");
        } else {
          setTokenInfo(data);
        }
      } catch {
        setTokenError("Failed to validate invite token. Please try again.");
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

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
    if (!validateForm() || !token) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Onboarding failed", { description: data.error });
        return;
      }

      // Auto sign in
      const result = await signIn("credentials", {
        email: tokenInfo?.email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.success("Account created!", {
          description: "Please sign in with your new credentials.",
        });
        router.push("/login");
      } else {
        toast.success("Welcome to MyZipVault!", {
          description: "Your account is ready.",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get the invite message based on token type
  const inviteMessage =
    tokenInfo?.tokenType === "reference_request"
      ? `${tokenInfo?.nurseName || "A nurse"}, who worked with you at ${tokenInfo?.facilityName || "a facility"}, is requesting a professional reference`
      : `You've been invited to MyZipVault by ${tokenInfo?.agencyName || "an agency"}`;

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
              <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-4xl font-bold">ZV</span>
            </div>
            <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[28px] font-bold text-white mt-4">MyZipVault</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4]">
          <div className="max-w-[400px] w-full space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
              <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-4xl font-bold">ZV</span>
            </div>
            <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[28px] font-bold text-white mt-4">MyZipVault</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4]">
          <div className="max-w-[400px] w-full text-center">
            <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl mb-6">
              {tokenError}
            </div>
            <Link href="/login">
              <Button variant="outline" className="gap-2 rounded-xl border-[#E5E7EB]">
                <ArrowLeft className="size-4" />
                Go to Sign In
              </Button>
            </Link>
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
          <p className="text-white/75 text-base mt-2" style={{ fontFamily: "Inter, sans-serif" }}>Healthcare credential verification, simplified</p>
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
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4]">
        <div className="max-w-[400px] w-full">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#166534] rounded-2xl mb-3">
              <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-2xl font-bold">ZV</span>
            </div>
            <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-2xl font-bold text-[#111827]">MyZipVault</h2>
          </div>

          {/* Invited badge */}
          <div className="inline-flex items-center gap-2 bg-[#CCFBF1] text-[#0D9488] px-3.5 py-1.5 rounded-full text-sm font-medium mb-4">
            <Mail className="size-3.5" />
            You have been invited
          </div>

          <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
            Welcome aboard
          </h1>
          <p className="text-[#6B7280] text-base mt-2 mb-8">
            Set up your account to get started
          </p>

          {/* Invite message */}
          <div className="mb-6 p-4 bg-[#DCFCE7] border border-[#166534]/10 rounded-xl">
            <div className="flex items-start gap-3">
              <Mail className="size-5 text-[#166534] shrink-0 mt-0.5" />
              <p className="text-sm text-[#166534]">{inviteMessage}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={tokenInfo?.email || ""}
                disabled
                className="bg-[#F8F7F4] border-[#E5E7EB] rounded-xl p-3.5 text-[#9CA3AF]"
              />
              <p className="text-xs text-[#9CA3AF]">This email is from your invitation</p>
            </div>

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
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                disabled={isLoading}
                className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.password ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              <div className="space-y-1.5 pt-1">
                <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                <PasswordCheck label="One number" met={checks.number} />
              </div>
            </div>

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
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                disabled={isLoading}
                className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.confirmPassword ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
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
              className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                "Activate Account"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex">
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
                <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-4xl font-bold">ZV</span>
              </div>
              <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[28px] font-bold text-white mt-4">MyZipVault</h2>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4]">
            <div className="max-w-[400px] w-full space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      }
    >
      <OnboardPageInner />
    </Suspense>
  );
}
