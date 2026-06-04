"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Shield, Loader2, ArrowLeft, QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import QRCode from "qrcode";

type LoginStep = 1 | 2;

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // TOTP setup state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Generate QR code data URL from otpAuthUri
  const generateQrCode = useCallback(async (otpAuthUri: string) => {
    setIsGeneratingQr(true);
    try {
      const dataUrl = await QRCode.toDataURL(otpAuthUri, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error("QR code generation error:", err);
    } finally {
      setIsGeneratingQr(false);
    }
  }, []);

  // Clean up: sign out if we navigate away during step 2
  useEffect(() => {
    return () => {
      // If we're in step 2 and the component unmounts, we might want to clean up
    };
  }, []);

  const copySecretToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(totpSecret);
      setCopiedSecret(true);
      toast.success("Secret copied to clipboard");
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

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
        // Sign out the non-super-admin user
        await signIn("credentials", { redirect: false });
        setIsLoading(false);
        return;
      }

      // Check if TOTP is set up
      const statusRes = await fetch("/api/auth/totp/status");
      const statusData = await statusRes.json();

      if (!statusData.setup) {
        // TOTP not set up yet - generate secret and show setup dialog
        const setupRes = await fetch("/api/auth/totp/setup", {
          method: "POST",
        });
        const setupData = await setupRes.json();

        if (setupRes.ok && setupData.secret) {
          setTotpSecret(setupData.secret);
          await generateQrCode(setupData.otpAuthUri);
          setShowSetupDialog(true);
        } else {
          toast.error("Failed to set up TOTP", {
            description: setupData.error || "Please try again",
          });
        }
        setIsLoading(false);
        return;
      }

      // TOTP is already set up, proceed to step 2
      setStep(2);
    } catch {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setShowSetupDialog(false);
    setStep(2);
    toast.success("TOTP setup complete", {
      description: "Please enter the code from your authenticator app",
    });
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        toast.error("Invalid verification code", {
          description: verifyData.error || "Please check the code and try again",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Verified successfully!");
      router.push("/superadmin/dashboard");
    } catch {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setOtp("");
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
                Enter the code from your authenticator app
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
                  Enter the 6-digit code from your authenticator app
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
                  Open your authenticator app (Google Authenticator, Authy, etc.) and enter the code shown
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
                onClick={handleBackToStep1}
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

      {/* TOTP Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5 text-rose-600" />
              Set Up Authenticator
            </DialogTitle>
            <DialogDescription>
              Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.) to set up two-factor authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-lg border">
                {isGeneratingQr ? (
                  <div className="size-[256px] flex items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  </div>
                ) : qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="TOTP QR Code"
                    width={256}
                    height={256}
                    className="size-[256px]"
                  />
                ) : (
                  <div className="size-[256px] flex items-center justify-center text-muted-foreground text-sm">
                    QR code unavailable
                  </div>
                )}
              </div>
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Manual Entry Key
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono break-all select-all">
                  {totpSecret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={copySecretToClipboard}
                >
                  {copiedSecret ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If you can&apos;t scan the QR code, enter this key manually in your authenticator app.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full gap-2"
              onClick={handleSetupComplete}
            >
              I&apos;ve Added the Account — Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
