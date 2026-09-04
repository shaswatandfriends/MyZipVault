"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, Eye, EyeOff, ShieldCheck, ArrowRight, X } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

  if (score <= 1) return { score, label: "Weak", color: "var(--status-red)" };
  if (score <= 2) return { score, label: "Fair", color: "#D97706" };
  if (score <= 3) return { score, label: "Good", color: "#70B5F9" };
  if (score <= 4) return { score, label: "Strong", color: "var(--primary-vivid)" };
  return { score, label: "Very Strong", color: "var(--primary)" };
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
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <div className="mesh-background" />
        <Loader2 className="size-8 animate-spin text-primary relative z-10" />
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
        body: JSON.stringify({ token, password: newPassword }),
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
    <div className="min-h-screen flex relative">
      <div className="mesh-background" />

      <AuthSlideshowPanel
        tagline="Healthcare credential verification, simplified"
        trustPoints={trustPoints}
      />

      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="max-w-[440px] w-full relative">
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

          {hasTokenError ? (
            <>
              {/* Error icon — spatial circle */}
              <div
                className="flex items-center justify-center size-16 mb-6 rounded-[20px]"
                style={{
                  background: "rgba(184,64,64,0.1)",
                  border: "0.5px solid rgba(184,64,64,0.3)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <X className="size-8" style={{ color: "var(--status-red)" }} />
              </div>
              <h1
                className="text-[2.5rem] font-bold leading-[1.1] mb-3 text-foreground"
                style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
              >
                Invalid link
              </h1>
              <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
                {errors.token}
              </p>
              <Button asChild size="lg" className="w-full">
                <Link href="/forgot-password">
                  Request New Link
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="text-sm font-semibold transition-colors"
                  style={{ color: "var(--primary)" }}
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success icon — spatial circle */}
              <div
                className="flex items-center justify-center size-16 mb-6 rounded-[20px]"
                style={{
                  background: "var(--primary-light)",
                  border: "0.5px solid var(--status-green-border)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <ShieldCheck className="size-8" style={{ color: "var(--primary)" }} />
              </div>

              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }} />
                <span
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--terra)", letterSpacing: "0.2em" }}
                >
                  New Password
                </span>
              </div>

              <h1
                className="text-[2.5rem] font-bold leading-[1.1] mb-3 text-foreground"
                style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
              >
                Reset your password
              </h1>
              <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="newPassword"
                    className="block text-xs font-bold uppercase"
                    style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
                  >
                    New Password
                  </label>
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
                      aria-invalid={!!errors.newPassword}
                      className="pr-11"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.newPassword}</p>
                  )}

                  {/* Password strength bar */}
                  {newPassword.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{
                              background: level <= strength.score ? strength.color : "var(--border)",
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Password strength: <span className="font-semibold">{strength.label}</span>
                      </p>
                      <div className="space-y-1">
                        {checks.map((check) => (
                          <div key={check.label} className="flex items-center gap-1.5">
                            {check.met ? (
                              <Check className="size-3 shrink-0" style={{ color: "var(--primary)" }} />
                            ) : (
                              <div
                                className="size-3 rounded-full shrink-0"
                                style={{ border: "1.5px solid var(--border-strong)" }}
                              />
                            )}
                            <span
                              className={`text-xs ${check.met ? "font-medium" : "font-normal"}`}
                              style={{ color: check.met ? "var(--primary)" : "var(--text-muted)" }}
                            >
                              {check.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-bold uppercase"
                    style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
                  >
                    Confirm Password
                  </label>
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
                      aria-invalid={!!errors.confirmPassword}
                      className="pr-11"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.confirmPassword}</p>
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

          {/* Security badges */}
          <div className="mt-10 pt-6 flex items-center justify-center gap-6 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" style={{ color: "var(--terra)" }} />
              <span className="text-[0.6875rem] font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>HIPAA Aligned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="var(--terra)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-[0.6875rem] font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
