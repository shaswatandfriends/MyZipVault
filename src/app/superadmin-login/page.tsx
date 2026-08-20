"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Loader2, Mail, RefreshCw, ArrowRight, ShieldCheck, Zap, Lock, ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";
import { Button } from "@/components/ui/button";

type LoginStep = "request" | "verify";

const trustPoints = [
  "Highest security level — OTP required",
  "Full system access with audit trail",
  "All actions logged for compliance",
];

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("request");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
      window.location.href = "/superadmin/dashboard";
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
    <div className="min-h-screen flex relative">
      <div className="mesh-background" />

      <AuthSlideshowPanel
        tagline="Platform administration."
        trustPoints={trustPoints}
      />

      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="max-w-[460px] w-full relative">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-10">
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

          {step === "request" ? (
            <>
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }} />
                <span
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--terra)", letterSpacing: "0.2em" }}
                >
                  Super Admin Portal
                </span>
              </div>

              <h1
                className="text-[2.5rem] font-bold leading-[1.1] mb-3 text-foreground"
                style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
              >
                Verify your identity.
              </h1>
              <p
                className="text-base leading-relaxed mb-8"
                style={{ color: "var(--text-secondary)" }}
              >
                Confirm with a one-time code sent to your email.
              </p>

              <div className="space-y-5">
                {/* Fixed email indicator — spatial material-thin */}
                <div className="space-y-2">
                  <span
                    className="block text-xs font-bold uppercase"
                    style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
                  >
                    Email
                  </span>
                  <div className="spatial-material-thin flex items-center gap-2.5 px-4 py-3.5">
                    <Mail className="size-4 shrink-0" style={{ color: "var(--terra)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Super Administrator
                    </span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                    Email is configured server-side for security.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
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
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }} />
                <span
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--terra)", letterSpacing: "0.2em" }}
                >
                  Email Verification
                </span>
              </div>

              <h1
                className="text-[2.5rem] font-bold leading-[1.1] mb-3 text-foreground"
                style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
              >
                Enter the code.
              </h1>
              <p
                className="text-base leading-relaxed mb-8"
                style={{ color: "var(--text-secondary)" }}
              >
                We sent a 6-digit code to your email.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-4">
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
                  <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                    Code expires in 5 minutes. Check your spam folder if you don&apos;t see it.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  size="lg"
                  className="w-full"
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
                    onClick={handleBackToRequest}
                  >
                    <ArrowLeft className="size-3.5" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Security badges */}
          <div className="mt-10 pt-6 flex items-center justify-center gap-6 border-t flex-wrap" style={{ borderColor: "var(--border)" }}>
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
              { icon: Zap, label: "OTP Secured" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="size-3.5" style={{ color: "var(--terra)" }} />
                <span
                  className="text-[0.6875rem] font-medium"
                  style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="size-4" />
              Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
