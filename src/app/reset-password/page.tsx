"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Check, Eye, EyeOff, ShieldCheck, Zap, ArrowRight, X } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

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
  if (score <= 4) return { score, label: "Strong", color: "bg-primary" };
  return { score, label: "Very Strong", color: "bg-primary" };
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
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
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Healthcare credential verification, simplified"
        trustPoints={trustPoints}
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

          {/* Glass card wrapping content */}
          <div className="glass-card-static p-8 rounded-[var(--radius-xl)]">
            {hasTokenError ? (
              <>
                <div className="flex items-center justify-center size-16 bg-red-50 rounded-2xl mb-6">
                  <X className="size-8 text-red-500" />
                </div>
                <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                  Invalid link
                </h1>
                <p className="text-text-secondary text-base mt-2 mb-8">
                  {errors.token}
                </p>
                <Link href="/forgot-password">
                  <Button className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base">
                    Request New Link
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <div className="mt-4 text-center">
                  <Link href="/login" className="text-sm text-primary hover:text-primary-hover font-semibold transition-colors">
                    Back to Sign In
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
                  <ShieldCheck className="size-8 text-primary" />
                </div>
                <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                  Reset your password
                </h1>
                <p className="text-text-secondary text-base mt-2 mb-8">
                  Enter your new password below.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
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
                        className={`bg-surface border-border rounded-xl h-11 pr-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.newPassword ? "border-destructive" : ""}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
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
                                level <= strength.score ? strength.color : "bg-border"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-text-secondary">
                          Password strength: <span className="font-medium">{strength.label}</span>
                        </p>
                        <div className="space-y-1">
                          {checks.map((check) => (
                            <div key={check.label} className="flex items-center gap-1.5">
                              {check.met ? (
                                <Check className="size-3 text-primary shrink-0" />
                              ) : (
                                <div className="size-3 rounded-full border border-border shrink-0" />
                              )}
                              <span className={`text-xs ${check.met ? "text-primary font-medium" : "text-text-muted"}`}>
                                {check.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
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
                        className={`bg-surface border-border rounded-xl h-11 pr-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.confirmPassword ? "border-destructive" : ""}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
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
                    className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Resetting password...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
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
