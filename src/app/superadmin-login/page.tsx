"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Loader2, Mail, RefreshCw, ArrowRight, ShieldCheck, Zap } from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

type LoginStep = "request" | "verify";

const trustPoints = [
  "Highest Security Level",
  "Full System Access",
  "Audit Trail Enabled",
];

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("request");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.cooldown) {
          setResendCooldown(data.cooldown);
          toast.error("Please wait before requesting a new code", {
            description: `Try again in ${data.cooldown} seconds`,
          });
        } else {
          toast.error("Failed to send verification code", {
            description: data.error || "Please try again",
          });
        }
        return;
      }

      setStep("verify");
      setResendCooldown(60);
      toast.success("Verification code sent", {
        description: "Check your email for the 6-digit code",
      });
    } catch {
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      // First verify the OTP server-side
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        toast.error("Invalid verification code", {
          description: verifyData.error || "Please check the code and try again",
        });
        setIsLoading(false);
        return;
      }

      // OTP verified — sign out existing session first, then sign in via NextAuth
      await signOut({ redirect: false });
      const result = await signIn("credentials", {
        email: "__superadmin__",
        password: `otp:${otp}`,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Authentication failed", {
          description: "Could not create your session. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Welcome to the Super Admin Portal", {
        description: "You have been verified successfully.",
      });
      router.push("/superadmin/dashboard");
    } catch {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.cooldown) {
          setResendCooldown(data.cooldown);
        }
        toast.error("Failed to resend code", {
          description: data.error || "Please try again",
        });
        return;
      }

      setResendCooldown(60);
      setOtp("");
      toast.success("New code sent", {
        description: "Check your email for the new 6-digit code",
      });
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToRequest = () => {
    setStep("request");
    setOtp("");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Platform Administration"
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

          {/* Glass card wrapping form */}
          <div className="glass-card-static p-8 rounded-[var(--radius-xl)]">
            {step === "request" ? (
              <>
                <div className="mb-8">
                  <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                    Super Admin Portal
                  </h1>
                  <p className="text-text-secondary text-base mt-2">
                    Verify your identity with a one-time code
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Fixed email indicator */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Email
                    </span>
                    <div className="flex items-center gap-2 bg-primary-light border border-primary/20 rounded-xl px-4 py-3">
                      <Mail className="size-4 text-primary shrink-0" />
                      <span className="text-sm text-primary font-medium">Super Administrator</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      Email is configured server-side for security
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                    disabled={isLoading}
                    onClick={handleSendOtp}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                    Email Verification
                  </h1>
                  <p className="text-text-secondary text-base mt-2">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-4">
                    <span className="text-sm font-medium text-text-secondary text-center block">
                      Enter the 6-digit code from your email
                    </span>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-xs text-text-muted text-center">
                      Code expires in 5 minutes. Check your spam folder if you don&apos;t see it.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify &amp; Sign In
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-text-secondary"
                      onClick={handleBackToRequest}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary-hover font-semibold transition-colors"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isLoading}
                    >
                      <RefreshCw className={`size-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                    </Button>
                  </div>
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

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
            >
              &larr; Back to main site
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
