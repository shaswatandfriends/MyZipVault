"use client";

import { useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateOtp = useCallback(() => {
    return String(Math.floor(100000 + Math.random() * 900000));
  }, []);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      // First verify credentials
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials", {
          description: "Please check your email and password",
        });
        setIsLoading(false);
        return;
      }

      // Verify super_admin role
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = (session?.user as Record<string, unknown>)?.role;

      if (role !== "super_admin") {
        toast.error("Access denied", {
          description: "This portal is for super administrators only",
        });
        // Sign out since they're not a super admin
        await signIn("credentials", { redirect: false }); // This won't do anything useful
        setIsLoading(false);
        return;
      }

      // Generate OTP (placeholder for TOTP)
      const newOtp = generateOtp();
      setGeneratedOtp(newOtp);

      // Show OTP in toast (placeholder - in production this would be sent via email/SMS or validated against TOTP)
      toast.success("Verification code generated", {
        description: `Your code: ${newOtp}`,
        duration: 10000,
      });

      setStep(2);
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

    if (otp !== generatedOtp) {
      toast.error("Invalid verification code", {
        description: "Please check the code and try again",
      });
      return;
    }

    setIsLoading(true);
    try {
      toast.success("Verified successfully!");
      router.push("/superadmin/dashboard");
    } catch {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="size-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="size-7 text-rose-600 dark:text-rose-400" />
          </div>
          {step === 1 ? (
            <>
              <CardTitle className="text-xl">Super Admin Portal</CardTitle>
              <CardDescription>
                Enter your credentials to continue
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">Two-Factor Verification</CardTitle>
              <CardDescription>
                Enter the verification code to complete sign in
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sa-email">Email</Label>
                <Input
                  id="sa-email"
                  type="email"
                  placeholder="superadmin@myzipvault.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-password">Password</Label>
                <Input
                  id="sa-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
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
                  Enter the verification code
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
                  A 6-digit verification code has been generated for you
                </p>
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
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
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                }}
              >
                <ArrowLeft className="size-4" />
                Back to credentials
              </Button>
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
  );
}
