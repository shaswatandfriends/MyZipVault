"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, X, Mail, ArrowLeft, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="size-3.5 shrink-0" style={{ color: "var(--primary)" }} />
      ) : (
        <X className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
      )}
      <span
        className={met ? "font-medium" : "font-normal"}
        style={{ color: met ? "var(--primary)" : "var(--text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

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

  const sharedLabelClass = "block text-xs font-bold uppercase";
  const sharedLabelStyle = { color: "var(--text-secondary)", letterSpacing: "0.15em" } as const;

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex relative">
        <div className="mesh-background" />
        <AuthSlideshowPanel
          tagline="Your credentials. Your terms."
          trustPoints={trustPoints}
        />
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
          <div className="max-w-[460px] w-full space-y-4">
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
      <div className="min-h-screen flex relative">
        <div className="mesh-background" />
        <AuthSlideshowPanel
          tagline="Your credentials. Your terms."
          trustPoints={trustPoints}
        />
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
          <div className="max-w-[460px] w-full text-center">
            {/* Error callout — spatial */}
            <div
              className="rounded-[16px] p-4 mb-6 text-left"
              style={{
                background: "rgba(184,64,64,0.08)",
                border: "0.5px solid var(--status-red-border)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "var(--status-red-dark)",
              }}
            >
              {tokenError}
            </div>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">
                <ArrowLeft className="size-4" />
                Go to Sign In
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      <div className="mesh-background" />
      <AuthSlideshowPanel
        tagline="Your credentials. Your terms."
        trustPoints={trustPoints}
      />

      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="max-w-[460px] w-full">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-10">
            <div
              className="inline-flex items-center justify-center size-12 mb-3 rounded-[12px] text-white text-2xl font-bold"
              style={{
                background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
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

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }} />
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "var(--terra)", letterSpacing: "0.2em" }}
            >
              You&apos;re Invited
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-[2.5rem] font-bold leading-[1.1] mb-3 text-foreground"
            style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
          >
            Welcome aboard.
          </h1>
          <p
            className="text-base leading-relaxed mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            Set up your account to get started.
          </p>

          {/* Invite message — spatial material-thin */}
          <div className="spatial-material-thin p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="size-5 shrink-0 mt-0.5" style={{ color: "var(--terra)" }} />
              <p className="text-sm m-0 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {inviteMessage}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <label htmlFor="email" className={sharedLabelClass} style={sharedLabelStyle}>
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={tokenInfo?.email || ""}
                disabled
                className="opacity-70"
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                This email is from your invitation.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className={sharedLabelClass} style={sharedLabelStyle}>
                Password
              </label>
              <PasswordInput
                id="password"

                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                disabled={isLoading}
                aria-invalid={!!errors.password}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.password}</p>
              )}
              <div className="flex flex-col gap-1.5 pt-2">
                <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                <PasswordCheck label="One number" met={checks.number} />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className={sharedLabelClass} style={sharedLabelStyle}>
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"

                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                disabled={isLoading}
                aria-invalid={!!errors.confirmPassword}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.confirmPassword}</p>
              )}
            </div>

            {/* T&C */}
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="tos"
                  checked={tosAccepted}
                  onCheckedChange={(checked) => {
                    setTosAccepted(checked === true);
                    if (errors.tos) setErrors((prev) => ({ ...prev, tos: "" }));
                  }}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <label
                  htmlFor="tos"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  I agree to the{" "}
                  <Link href="/terms" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.tos && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>{errors.tos}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Activate Account"
              )}
            </Button>
          </form>

          {/* Security badges */}
          <div className="mt-10 pt-6 flex items-center justify-center gap-6 border-t" style={{ borderColor: "var(--border)" }}>
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
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
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex relative">
          <div className="mesh-background" />
          <AuthSlideshowPanel
            tagline="Your credentials. Your terms."
            trustPoints={trustPoints}
          />
          <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
            <div className="max-w-[460px] w-full space-y-4">
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
