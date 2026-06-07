"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Loader2, Mail, RefreshCw, Check } from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";

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

      // OTP verified — now sign in via NextAuth using the verified OTP
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
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
            <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-4xl font-bold">ZV</span>
          </div>
          <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[28px] font-bold text-white mt-4">MyZipVault</h2>
          <p className="text-white/75 text-base mt-2" style={{ fontFamily: "Inter, sans-serif" }}>Platform Administration</p>
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

          {step === "request" ? (
            <>
              <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
                Super Admin Portal
              </h1>
              <p className="text-[#6B7280] text-base mt-2 mb-8">
                Verify your identity with a one-time code
              </p>

              <div className="space-y-5">
                {/* Fixed email indicator */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">Email</span>
                  <div className="flex items-center gap-2 bg-[#DCFCE7] border border-[#166534]/20 rounded-xl px-4 py-3">
                    <Mail className="size-4 text-[#166534] shrink-0" />
                    <span className="text-sm text-[#166534] font-medium">Super Administrator</span>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Email is configured server-side for security
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
                  disabled={isLoading}
                  onClick={handleSendOtp}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending Code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
                Email Verification
              </h1>
              <p className="text-[#6B7280] text-base mt-2 mb-8">
                Enter the 6-digit code sent to your email
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-4">
                  <span className="text-sm font-medium text-[#6B7280] text-center block">
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
                  <p className="text-xs text-[#9CA3AF] text-center">
                    Code expires in 5 minutes. Check your spam folder if you don&apos;t see it.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#6B7280]"
                    onClick={handleBackToRequest}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#0D9488] hover:text-[#0D9488]"
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

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-[#9CA3AF] hover:text-[#111827] transition-colors"
            >
              &larr; Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
