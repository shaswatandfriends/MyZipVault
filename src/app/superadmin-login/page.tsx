"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Shield, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type LoginStep = "request" | "verify";

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
    <div className="min-h-screen bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[440px]">
        <Card className="shadow-xl border-rose-200/60 dark:border-rose-800/40">
          <CardHeader className="space-y-1.5 px-6 pt-6 pb-0 text-center">
            <div className="size-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-3">
              <Shield className="size-7 text-rose-600 dark:text-rose-400" />
            </div>
            {step === "request" ? (
              <>
                <CardTitle className="text-xl">Super Admin Portal</CardTitle>
                <CardDescription className="text-sm">
                  Verify your identity with a one-time code
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-xl">Email Verification</CardTitle>
                <CardDescription className="text-sm">
                  Enter the 6-digit code sent to your email
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6">
            {step === "request" ? (
              <div className="space-y-5">
                {/* Fixed email indicator (no input — server controls this) */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Email</span>
                  <div className="flex items-center gap-2 bg-rose-100/60 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40 rounded-md px-3 py-2.5">
                    <Mail className="size-4 text-rose-500 shrink-0" />
                    <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">Super Administrator</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email is configured server-side for security
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full h-11 gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={isLoading}
                  onClick={handleSendOtp}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-4">
                  <span className="text-sm font-medium text-center block">
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
                  <p className="text-xs text-muted-foreground text-center">
                    Code expires in 5 minutes. Check your spam folder if you don&apos;t see it.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
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
                    className="text-muted-foreground"
                    onClick={handleBackToRequest}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <RefreshCw className={`size-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                  </Button>
                </div>
              </form>
            )}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                &larr; Back to main site
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
