"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2, Briefcase, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AgencyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Sign in failed", {
          description: "Invalid email or password",
        });
        return;
      }

      // Fetch session to get role + approval status
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role as string | undefined;
      const isApproved = sessionData?.user?.isApproved as boolean | undefined;

      // Check role — only client_admin and client_recruiter allowed
      if (role !== "client_admin" && role !== "client_recruiter") {
        toast.error("Access denied", {
          description:
            "This portal is for staffing agencies and recruiters only. Use the candidate login instead.",
        });
        await signOut({ redirect: false });
        return;
      }

      // Check approval status
      if (isApproved === false) {
        toast.error("Account pending approval", {
          description:
            "Your account is awaiting admin approval. You will be notified once approved.",
          duration: 8000,
        });
        await signOut({ redirect: false });
        return;
      }

      toast.success("Welcome back!", {
        description: "You have been signed in successfully.",
      });
      router.push("/recruiter/dashboard");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[440px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <Briefcase className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Agency Portal
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            Sign in to your staffing agency or recruiter account
          </p>
        </div>

        <Card className="shadow-xl border-border/40">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1.5 px-6 pt-6 pb-0">
              <CardTitle className="text-lg">Sign In</CardTitle>
              <CardDescription className="text-sm">
                Enter your credentials to access your agency dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-5 pb-4 space-y-4">
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
                      setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  disabled={isLoading}
                  className={errors.email ? "border-destructive" : ""}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      toast.info("Password reset coming soon!")
                    }
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  disabled={isLoading}
                  className={errors.password ? "border-destructive" : ""}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="px-6 pb-6 flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{" "}
                <Link
                  href="/agency-signup"
                  className="text-primary font-medium hover:underline"
                >
                  Register your agency
                </Link>
              </p>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Healthcare professional?{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Candidate Login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to main site
          </Link>
        </div>
      </div>
    </div>
  );
}
