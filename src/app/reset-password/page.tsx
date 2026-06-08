"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, Eye, EyeOff, ShieldCheck, X } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const trustPoints = [
  "HIPAA-Aligned Security",
  "You Control Access",
  "100% Free for Nurses",
];

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-emerald-500" };
  return { score, label: "Very Strong", color: "bg-[#166534]" };
}

interface PasswordCheck {
  label: string;
  met: boolean;
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase and lowercase letters", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "At least one number", met: /\d/.test(password) },
    { label: "At least one special character", met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <Loader2 className="size-8 animate-spin text-[#166534]" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string; token?: string }>({});

  useEffect(() => {
    if (!token) {
      setErrors((prev) => ({ ...prev, token: "Invalid or missing reset token. Please request a new password reset link." }));
    }
  }, [token]);

  const validateForm = useCallback(() => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Error", {
          description: data.error || "Something went wrong. Please try again.",
        });
        return;
      }

      toast.success("Password reset successful", {
        description: "You can now sign in with your new password.",
      });
      router.push("/login");
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);
  const checks = getPasswordChecks(newPassword);
  const hasTokenError = !!errors.token;

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

          {hasTokenError ? (
            <>
              <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-6">
                <X className="size-8 text-red-500" />
              </div>
              <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
                Invalid link
              </h1>
              <p className="text-[#6B7280] text-base mt-2 mb-8">
                {errors.token}
              </p>
              <Link href="/forgot-password">
                <Button className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all">
                  Request New Link
                </Button>
              </Link>
              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-[#0D9488] hover:underline font-medium">
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-16 h-16 bg-[#CCFBF1] rounded-2xl mb-6">
                <ShieldCheck className="size-8 text-[#0D9488]" />
              </div>
              <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
                Reset your password
              </h1>
              <p className="text-[#6B7280] text-base mt-2 mb-8">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      disabled={isLoading}
                      className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 pr-11 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.newPassword ? "border-destructive" : ""}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-xs text-destructive">{errors.newPassword}</p>
                  )}

                  {/* Password strength bar */}
                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              level <= strength.score ? strength.color : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        Password strength: <span className="font-medium">{strength.label}</span>
                      </p>
                      <div className="space-y-1">
                        {checks.map((check) => (
                          <div key={check.label} className="flex items-center gap-1.5">
                            {check.met ? (
                              <Check className="size-3 text-emerald-500 shrink-0" />
                            ) : (
                              <div className="size-3 rounded-full border border-gray-300 shrink-0" />
                            )}
                            <span className={`text-xs ${check.met ? "text-emerald-600" : "text-[#9CA3AF]"}`}>
                              {check.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      disabled={isLoading}
                      className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 pr-11 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.confirmPassword ? "border-destructive" : ""}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
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
                      Resetting password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
