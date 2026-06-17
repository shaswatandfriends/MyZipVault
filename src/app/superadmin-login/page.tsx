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

  const buttonStyle = (isLoading: boolean, disabled?: boolean): React.CSSProperties => ({
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "1rem 1.5rem",
    background: "var(--editorial-navy)",
    color: "var(--editorial-cream)",
    fontSize: "0.875rem",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    border: "1px solid var(--editorial-navy)",
    borderRadius: "2px",
    cursor: isLoading || disabled ? "not-allowed" : "pointer",
    opacity: isLoading || disabled ? 0.7 : 1,
    transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
  });

  const ghostButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.5rem 0.75rem",
    background: "transparent",
    color: "var(--editorial-ink-soft)",
    fontSize: "0.8125rem",
    fontWeight: 500,
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "color 150ms",
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--editorial-cream)" }}
    >
      <AuthSlideshowPanel
        tagline="Platform administration."
        trustPoints={trustPoints}
      />

      <div
        className="flex-1 flex items-center justify-center p-8 md:p-12 relative"
        style={{ background: "var(--editorial-cream)" }}
      >
        <div className="max-w-[440px] w-full relative">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-10">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                background: "var(--editorial-navy)",
                color: "var(--editorial-cream)",
                fontFamily: "var(--editorial-font-serif)",
                fontWeight: 700,
                fontSize: "1.5rem",
                borderRadius: "2px",
                marginBottom: "1rem",
              }}
            >
              M
            </div>
            <h2
              style={{
                fontFamily: "var(--editorial-font-serif)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--editorial-navy)",
                letterSpacing: "-0.02em",
              }}
            >
              MyZipVault
            </h2>
          </div>

          {step === "request" ? (
            <>
              {/* Eyebrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--editorial-gold-dark)",
                  }}
                >
                  Super Admin Portal
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "var(--editorial-font-serif)",
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "var(--editorial-navy)",
                  marginBottom: "0.75rem",
                }}
              >
                Verify your identity.
              </h1>
              <p
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.6,
                  color: "var(--editorial-ink-soft)",
                  marginBottom: "2.5rem",
                }}
              >
                Confirm with a one-time code sent to your email.
              </p>

              <div className="space-y-5">
                {/* Fixed email indicator */}
                <div className="space-y-2">
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "var(--editorial-ink-soft)",
                    }}
                  >
                    Email
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      background: "var(--editorial-cream-cool)",
                      border: "1px solid var(--editorial-rule)",
                      borderRadius: "2px",
                      padding: "0.875rem 1rem",
                    }}
                  >
                    <Mail className="size-4 shrink-0" style={{ color: "var(--editorial-gold-dark)" }} />
                    <span style={{ fontSize: "0.9375rem", color: "var(--editorial-navy)", fontWeight: 500 }}>
                      Super Administrator
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--editorial-ink-muted)", marginTop: "0.375rem" }}>
                    Email is configured server-side for security.
                  </p>
                </div>

                <button
                  type="button"
                  style={buttonStyle(isLoading)}
                  disabled={isLoading}
                  onClick={handleSendOtp}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.background = "var(--editorial-navy-light)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) e.currentTarget.style.background = "var(--editorial-navy)";
                  }}
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
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Eyebrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--editorial-gold-dark)",
                  }}
                >
                  Email Verification
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "var(--editorial-font-serif)",
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "var(--editorial-navy)",
                  marginBottom: "0.75rem",
                }}
              >
                Enter the code.
              </h1>
              <p
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.6,
                  color: "var(--editorial-ink-soft)",
                  marginBottom: "2.5rem",
                }}
              >
                We sent a 6-digit code to your email.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-4">
                  <div style={{ display: "flex", justifyContent: "center" }}>
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
                  <p style={{ fontSize: "0.75rem", color: "var(--editorial-ink-muted)", textAlign: "center" }}>
                    Code expires in 5 minutes. Check your spam folder if you don&apos;t see it.
                  </p>
                </div>

                <button
                  type="submit"
                  style={buttonStyle(isLoading, otp.length !== 6)}
                  disabled={isLoading || otp.length !== 6}
                  onMouseEnter={(e) => {
                    if (!isLoading && otp.length === 6) e.currentTarget.style.background = "var(--editorial-navy-light)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) e.currentTarget.style.background = "var(--editorial-navy)";
                  }}
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
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <button
                    type="button"
                    style={ghostButtonStyle}
                    onClick={handleBackToRequest}
                  >
                    <ArrowLeft className="size-3.5" />
                    Back
                  </button>
                  <button
                    type="button"
                    style={{
                      ...ghostButtonStyle,
                      color: resendCooldown > 0 || isLoading ? "var(--editorial-ink-muted)" : "var(--editorial-navy)",
                      fontWeight: 600,
                    }}
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Security badges */}
          <div
            style={{
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--editorial-rule-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
            }}
          >
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
              { icon: Zap, label: "OTP Secured" },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Icon className="size-3.5" style={{ color: "var(--editorial-gold-dark)" }} />
                <span
                  style={{
                    fontSize: "0.6875rem",
                    letterSpacing: "0.05em",
                    color: "var(--editorial-ink-muted)",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link
              href="/"
              style={{
                fontSize: "0.875rem",
                color: "var(--editorial-ink-muted)",
                textDecoration: "none",
              }}
            >
              &larr; Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
