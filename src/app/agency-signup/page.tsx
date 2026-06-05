"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Briefcase, User, Check, X, ArrowRight, Clock } from "lucide-react";
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

type AccountType = "agency" | "recruiter";

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
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

export default function AgencySignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("agency");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = getPasswordChecks(password);
  const allPasswordChecks =
    checks.minLength && checks.uppercase && checks.lowercase && checks.number;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";

    if (accountType === "agency" && !agencyName.trim()) {
      newErrors.agencyName = "Agency name is required";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

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
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/agency-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          accountType,
          agencyName: accountType === "agency" ? agencyName.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Sign up failed", {
          description: data.error || "Failed to create account",
        });
        return;
      }

      setIsSuccess(true);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state: pending approval ──
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-[440px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-lg mb-4">
              <Clock className="size-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Registration Submitted!
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Your account is pending admin approval
            </p>
          </div>

          <Card className="shadow-xl border-border/40">
            <CardContent className="px-6 pt-6 pb-6 space-y-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  Thank you for registering{accountType === "agency" ? ` ${agencyName}` : ""}! Our team will review your application and approve your account shortly. You&apos;ll receive an email once your account is activated.
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  Approval typically takes 1-2 business days
                </p>
                <p className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  You&apos;ll be notified via email once approved
                </p>
                <p className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  Contact support if you have any questions
                </p>
              </div>
            </CardContent>
            <CardFooter className="px-6 pb-6 flex flex-col gap-3">
              <Link href="/agency-login" className="w-full">
                <Button variant="outline" className="w-full">
                  Go to Agency Login
                </Button>
              </Link>
              <Link href="/" className="w-full">
                <Button variant="ghost" className="w-full">
                  Back to Homepage
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[440px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <Briefcase className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Join MyZipVault
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            For staffing agencies & healthcare recruiters
          </p>
        </div>

        <Card className="shadow-xl border-border/40">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1.5 px-6 pt-6 pb-0">
              {/* Account Type Toggle */}
              <div className="flex rounded-lg bg-muted p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAccountType("agency")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    accountType === "agency"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Briefcase className="size-3.5" />
                  Staffing Agency
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("recruiter")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    accountType === "recruiter"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="size-3.5" />
                  Individual Recruiter
                </button>
              </div>
              <CardTitle className="text-lg pt-1">
                {accountType === "agency"
                  ? "Agency Sign Up"
                  : "Recruiter Sign Up"}
              </CardTitle>
              <CardDescription className="text-sm">
                {accountType === "agency"
                  ? "Register your staffing agency on MyZipVault"
                  : "Create your individual recruiter account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-5 pb-4 space-y-4">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName)
                        setErrors((prev) => ({ ...prev, firstName: "" }));
                    }}
                    disabled={isLoading}
                    className={errors.firstName ? "border-destructive" : ""}
                    autoComplete="given-name"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errors.lastName)
                        setErrors((prev) => ({ ...prev, lastName: "" }));
                    }}
                    disabled={isLoading}
                    className={errors.lastName ? "border-destructive" : ""}
                    autoComplete="family-name"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Agency Name (only for agency) */}
              {accountType === "agency" && (
                <div className="space-y-2">
                  <Label htmlFor="agencyName">Agency / Organization Name</Label>
                  <Input
                    id="agencyName"
                    type="text"
                    placeholder="Acme Healthcare Staffing"
                    value={agencyName}
                    onChange={(e) => {
                      setAgencyName(e.target.value);
                      if (errors.agencyName)
                        setErrors((prev) => ({ ...prev, agencyName: "" }));
                    }}
                    disabled={isLoading}
                    className={errors.agencyName ? "border-destructive" : ""}
                    autoComplete="organization"
                  />
                  {errors.agencyName && (
                    <p className="text-xs text-destructive">
                      {errors.agencyName}
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@agency.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email)
                      setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  disabled={isLoading}
                  className={errors.email ? "border-destructive" : ""}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  disabled={isLoading}
                  className={errors.password ? "border-destructive" : ""}
                  autoComplete="new-password"
                />
                {errors.password && !allPasswordChecks && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                <div className="space-y-1 pt-1">
                  <PasswordCheck
                    label="At least 8 characters"
                    met={checks.minLength}
                  />
                  <PasswordCheck
                    label="One uppercase letter"
                    met={checks.uppercase}
                  />
                  <PasswordCheck
                    label="One lowercase letter"
                    met={checks.lowercase}
                  />
                  <PasswordCheck label="One number" met={checks.number} />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  disabled={isLoading}
                  className={
                    errors.confirmPassword ? "border-destructive" : ""
                  }
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* TOS */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="tos"
                    checked={tosAccepted}
                    onCheckedChange={(checked) => {
                      setTosAccepted(checked === true);
                      if (errors.tos)
                        setErrors((prev) => ({ ...prev, tos: "" }));
                    }}
                    disabled={isLoading}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="tos"
                    className="text-sm font-normal leading-snug"
                  >
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
            <CardFooter className="px-6 pb-6 flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-11 gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Submit Application <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link
                  href="/agency-login"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
