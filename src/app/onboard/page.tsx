"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, X, Mail, ArrowLeft, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

interface TokenInfo {
  email: string;
  role: string;
  tokenType: string;
  agencyName?: string;
  facilityName?: string;
  nurseName?: string;
}

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

const trustPoints = [
  "HIPAA-aligned security architecture",
  "You control who sees your credentials",
  "Free forever for healthcare professionals",
];

function OnboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [isValidating, setIsValidating] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = getPasswordChecks(password);
  const allPasswordChecks = checks.minLength && checks.uppercase && checks.lowercase && checks.number;

  useEffect(() => {
    if (!token) {
      setTokenError("No invite token provided. Please use the link from your invitation email.");
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/onboard?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setTokenError(data.error || "Invalid invite token");
        } else {
          setTokenInfo(data);
        }
      } catch {
        setTokenError("Failed to validate invite token. Please try again.");
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!allPasswordChecks) {
      newErrors.password = "Password does not meet all requirements";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!tosAccepted) {
      newErrors.tos = "You must accept the Terms & Conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Onboarding failed", { description: data.error });
        return;
      }

      const result = await signIn("credentials", {
        email: tokenInfo?.email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.success("Account created!", {
          description: "Please sign in with your new credentials.",
        });
        router.push("/login");
      } else {
        toast.success("Welcome to MyZipVault!", {
          description: "Your account is ready.",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inviteMessage =
    tokenInfo?.tokenType === "reference_request"
      ? `${tokenInfo?.nurseName || "A nurse"}, who worked with you at ${tokenInfo?.facilityName || "a facility"}, is requesting a professional reference`
      : `You've been invited to MyZipVault by ${tokenInfo?.agencyName || "an agency"}`;

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    background: "var(--editorial-paper, #FFFEFA)",
    border: `1px solid ${hasError ? "var(--editorial-danger, #A0392E)" : "var(--editorial-rule, #D4CFC0)"}`,
    borderRadius: "2px",
    height: "48px",
    color: "var(--editorial-ink, #1A1A1A)",
    fontSize: "0.9375rem",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--editorial-ink-soft, #3A3A3A)",
  };

  const linkStyle: React.CSSProperties = {
    color: "var(--editorial-navy, #0B1F3A)",
    fontWeight: 500,
    textDecoration: "none",
    borderBottom: "1px solid var(--editorial-gold, #C9A961)",
    paddingBottom: "1px",
  };

  // Loading state
  if (isValidating) {
    return (
      <div
        className="min-h-screen flex"
        style={{ background: "var(--editorial-cream, #F5F0E6)" }}
      >
        <AuthSlideshowPanel
          tagline="Your credentials. Your terms."
          trustPoints={trustPoints}
        />
        <div
          className="flex-1 flex items-center justify-center p-8 md:p-12"
          style={{ background: "var(--editorial-cream, #F5F0E6)" }}
        >
          <div className="max-w-[440px] w-full space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div
        className="min-h-screen flex"
        style={{ background: "var(--editorial-cream, #F5F0E6)" }}
      >
        <AuthSlideshowPanel
          tagline="Your credentials. Your terms."
          trustPoints={trustPoints}
        />
        <div
          className="flex-1 flex items-center justify-center p-8 md:p-12"
          style={{ background: "var(--editorial-cream, #F5F0E6)" }}
        >
          <div className="max-w-[440px] w-full text-center">
            <div
              style={{
                background: "var(--editorial-danger-bg, #F5E3E0)",
                color: "var(--editorial-danger, #A0392E)",
                fontSize: "0.9375rem",
                padding: "1rem 1.5rem",
                borderRadius: "2px",
                marginBottom: "1.5rem",
                border: "1px solid var(--editorial-danger, #A0392E)",
              }}
            >
              {tokenError}
            </div>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                color: "var(--editorial-navy, #0B1F3A)",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid var(--editorial-navy, #0B1F3A)",
                borderRadius: "2px",
              }}
            >
              <ArrowLeft className="size-4" />
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--editorial-cream, #F5F0E6)" }}
    >
      <AuthSlideshowPanel
        tagline="Your credentials. Your terms."
        trustPoints={trustPoints}
      />

      {/* Right Panel - Form */}
      <div
        className="flex-1 flex items-center justify-center p-8 md:p-12"
        style={{ background: "var(--editorial-cream, #F5F0E6)" }}
      >
        <div className="max-w-[440px] w-full">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-10">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                background: "var(--editorial-navy, #0B1F3A)",
                color: "var(--editorial-cream, #F5F0E6)",
                fontFamily: "var(--editorial-font-serif, 'Playfair Display', serif)",
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
                fontFamily: "var(--editorial-font-serif, 'Playfair Display', serif)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--editorial-navy, #0B1F3A)",
                letterSpacing: "-0.02em",
              }}
            >
              MyZipVault
            </h2>
          </div>

          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold, #C9A961)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--editorial-gold-dark, #A8893F)",
              }}
            >
              You're Invited
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: "var(--editorial-font-serif, 'Playfair Display', serif)",
              fontSize: "2.5rem",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--editorial-navy, #0B1F3A)",
              marginBottom: "0.75rem",
            }}
          >
            Welcome aboard.
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--editorial-ink-soft, #3A3A3A)",
              marginBottom: "1.5rem",
            }}
          >
            Set up your account to get started.
          </p>

          {/* Invite message */}
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem 1.25rem",
              background: "var(--editorial-cream-cool, #EFE9DC)",
              border: "1px solid var(--editorial-rule-soft, #E8E3D4)",
              borderRadius: "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <Mail className="size-5 shrink-0 mt-0.5" style={{ color: "var(--editorial-gold-dark, #A8893F)" }} />
              <p style={{ fontSize: "0.875rem", color: "var(--editorial-ink-soft, #3A3A3A)", margin: 0 }}>
                {inviteMessage}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" style={labelStyle}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={tokenInfo?.email || ""}
                disabled
                style={{
                  ...inputStyle(),
                  color: "var(--editorial-ink-muted, #6B6B6B)",
                  background: "var(--editorial-cream-cool, #EFE9DC)",
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--editorial-ink-muted, #6B6B6B)" }}>
                This email is from your invitation.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" style={labelStyle}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                disabled={isLoading}
                style={inputStyle(!!errors.password)}
                autoComplete="new-password"
              />
              {errors.password && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger, #A0392E)" }}>
                  {errors.password}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", paddingTop: "0.5rem" }}>
                <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                <PasswordCheck label="One number" met={checks.number} />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" style={labelStyle}>
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                disabled={isLoading}
                style={inputStyle(!!errors.confirmPassword)}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger, #A0392E)" }}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* T&C */}
            <div className="space-y-2">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <Checkbox
                  id="tos"
                  checked={tosAccepted}
                  onCheckedChange={(checked) => {
                    setTosAccepted(checked === true);
                    if (errors.tos) setErrors((prev) => ({ ...prev, tos: "" }));
                  }}
                  disabled={isLoading}
                  style={{ marginTop: "0.125rem" }}
                />
                <Label
                  htmlFor="tos"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: "var(--editorial-ink-soft, #3A3A3A)",
                  }}
                >
                  I agree to the{" "}
                  <Link href="/terms" style={linkStyle}>Terms & Conditions</Link>
                  {" "}and{" "}
                  <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>
                </Label>
              </div>
              {errors.tos && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger, #A0392E)" }}>
                  {errors.tos}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "1rem 1.5rem",
                background: "var(--editorial-navy, #0B1F3A)",
                color: "var(--editorial-cream, #F5F0E6)",
                fontSize: "0.875rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "1px solid var(--editorial-navy, #0B1F3A)",
                borderRadius: "2px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = "var(--editorial-navy-light, #1E3A5F)";
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.background = "var(--editorial-navy, #0B1F3A)";
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Activate Account"
              )}
            </button>
          </form>

          {/* Security badges */}
          <div
            style={{
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--editorial-rule-soft, #E8E3D4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
            }}
          >
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Icon className="size-3.5" style={{ color: "var(--editorial-gold-dark, #A8893F)" }} />
                <span style={{ fontSize: "0.6875rem", letterSpacing: "0.05em", color: "var(--editorial-ink-muted, #6B6B6B)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
      {met ? (
        <Check className="size-3.5 shrink-0" style={{ color: "var(--editorial-success, #4A7C59)" }} />
      ) : (
        <X className="size-3.5 shrink-0" style={{ color: "var(--editorial-ink-muted, #6B6B6B)" }} />
      )}
      <span
        style={{
          color: met ? "var(--editorial-success, #4A7C59)" : "var(--editorial-ink-muted, #6B6B6B)",
          fontWeight: met ? 500 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex"
          style={{ background: "var(--editorial-cream, #F5F0E6)" }}
        >
          <AuthSlideshowPanel
            tagline="Your credentials. Your terms."
            trustPoints={trustPoints}
          />
          <div
            className="flex-1 flex items-center justify-center p-8 md:p-12"
            style={{ background: "var(--editorial-cream, #F5F0E6)" }}
          >
            <div className="max-w-[440px] w-full space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      }
    >
      <OnboardPageInner />
    </Suspense>
  );
}
