"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Shield, Loader2, ArrowLeft, Mail, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type LoginStep = 1 | 2;

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>(1);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      // First sign in with credentials
      const result = await signIn("credentials", {
        email: "__superadmin__", // placeholder — server uses env SUPERADMIN_EMAIL
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid password", {
          description: "Please check your password and try again",
        });
        setIsLoading(false);
        return;
      }

      // Verify the user is actually super_admin
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = (session?.user as Record<string, unknown>)?.role;

      if (role !== "super_admin") {
        toast.error("Access denied", {
          description: "This portal is for super administrators only",
        });
        await signOut({ redirect: false });
        setIsLoading(false);
        return;
      }

      // Credentials verified — now send OTP
      const otpRes = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email, password }),
      });

      const otpData = await otpRes.json();

      if (!otpRes.ok) {
        toast.error("Failed to send verification code", {
          description: otpData.error || "Please try again",
        });
        await signOut({ redirect: false });
        setIsLoading(false);
        return;
      }

      setOtpExpiry(otpData.expiresAt);
      setResendCooldown(60);
      setStep(2);
      toast.success("Verification code sent", {
        description: "Check your email for the 6-digit code",
      });
    } catch {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const email = session?.user?.email;

      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        toast.error("Invalid verification code", {
          description: verifyData.error || "Please check the code and try again",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Verified successfully!", {
        description: "Welcome to the Super Admin Portal",
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
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const email = session?.user?.email;

      const otpRes = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const otpData = await otpRes.json();

      if (!otpRes.ok) {
        toast.error("Failed to resend code", {
          description: otpData.error || "Please try again",
        });
        return;
      }

      setOtpExpiry(otpData.expiresAt);
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

  const handleBackToStep1 = async () => {
    await signOut({ redirect: false });
    setStep(1);
    setOtp("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <Card className="shadow-xl border-rose-200/60 dark:border-rose-800/40">
          <CardHeader className="px-8 pt-8 pb-2 text-center">
            <div className="size-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-5">
              <Shield className="size-7 text-rose-600 dark:text-rose-400" />
            </div>
            {step === 1 ? (
              <>
                <CardTitle className="text-xl">Super Admin Portal</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Enter your password to continue
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-xl">Email Verification</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Enter the 6-digit code sent to your email
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="px-8 py-6">
            {step === 1 ? (
              <form onSubmit={handleStep1} className="space-y-5">
                {/* Fixed email display (no input — server controls this) */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 bg-rose-100/60 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40 rounded-md px-3 py-2.5">
                    <Mail className="size-4 text-rose-500 shrink-0" />
                    <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">Super Administrator</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email is configured server-side for security
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sa-password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="sa-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleStep2} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-center block">
                    Enter the 6-digit code from your email
                  </Label>
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
                    className="gap-2 text-muted-foreground"
                    onClick={handleBackToStep1}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 text-rose-600 hover:text-rose-700"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                  </Button>
                </div>
              </form>
            )}
            <div className="mt-8 text-center">
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
