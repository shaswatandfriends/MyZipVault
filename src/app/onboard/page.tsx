"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Heart, Check, X, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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

export default function OnboardPage() {
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

      // Auto sign in
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

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-md">
                <Heart className="size-5" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome Aboard</h1>
          </div>
          <Card className="shadow-lg border-border/50">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-md">
                <Heart className="size-5" />
              </div>
            </div>
          </div>
          <Card className="shadow-lg border-border/50">
            <CardContent className="p-6 text-center">
              <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg mb-4">
                {tokenError}
              </div>
              <Link href="/login">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="size-4" />
                  Go to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get the invite message based on token type
  const inviteMessage =
    tokenInfo?.tokenType === "reference_request"
      ? `${tokenInfo?.nurseName || "A nurse"}, who worked with you at ${tokenInfo?.facilityName || "a facility"}, is requesting a professional reference`
      : `You've been invited to MyZipVault by ${tokenInfo?.agencyName || "an agency"}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-md">
              <Heart className="size-5" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome Aboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set up your account to get started
          </p>
        </div>

        {/* Invite message */}
        <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Mail className="size-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{inviteMessage}</p>
          </div>
        </div>

        <Card className="shadow-lg border-border/50">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Complete Your Profile</CardTitle>
              <CardDescription>
                Create a password to activate your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={tokenInfo?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">This email is from your invitation</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                  className={errors.password ? "border-destructive" : ""}
                  autoComplete="new-password"
                />
                <div className="space-y-1 pt-1">
                  <PasswordCheck label="At least 8 characters" met={checks.minLength} />
                  <PasswordCheck label="One uppercase letter" met={checks.uppercase} />
                  <PasswordCheck label="One lowercase letter" met={checks.lowercase} />
                  <PasswordCheck label="One number" met={checks.number} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                  className={errors.confirmPassword ? "border-destructive" : ""}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
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
                  <Label htmlFor="tos" className="text-sm font-normal leading-snug">
                    I agree to the{" "}
                    <span className="text-primary hover:underline cursor-pointer">
                      Terms & Conditions
                    </span>{" "}
                    and{" "}
                    <span className="text-primary hover:underline cursor-pointer">
                      Privacy Policy
                    </span>
                  </Label>
                </div>
                {errors.tos && (
                  <p className="text-xs text-destructive">{errors.tos}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Activate Account"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="size-3.5 text-emerald-600 shrink-0" />
      ) : (
        <X className="size-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={met ? "text-emerald-600" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}
