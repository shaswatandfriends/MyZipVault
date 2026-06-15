"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Check, ShieldCheck, Zap, ArrowRight } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

function getRoleDashboard(role: string): string {
  switch (role) {
    case "super_admin":
      return "/superadmin/dashboard";
    case "platform_admin":
      return "/admin/dashboard";
    case "client_admin":
    case "client_recruiter":
      return "/recruiter/dashboard";
    case "candidate":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

const trustPoints = [
  "HIPAA-Aligned Security",
  "You Control Access",
  "100% Free for Nurses",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
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
      // Sign out any existing session first to allow role switching
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Sign in failed", {
          description: result.error || "Invalid email or password",
        });
      } else {
        // Fetch session to get role for redirect
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role || "candidate";
        const dashboard = getRoleDashboard(role);
        toast.success("Welcome back!", {
          description: "You have been signed in successfully.",
        });
        router.push(dashboard);
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Healthcare credential verification, simplified"
        trustPoints={trustPoints}
        quoteCard={{
          text: "I used to fill out the same skills checklist 5 times per assignment. Now I do it once and share. Game changer.",
          attribution: "Sarah M., Travel RN",
        }}
        statsCard={[
          { value: "10K+", label: "Professionals" },
          { value: "500+", label: "Facilities" },
          { value: "99.9%", label: "Uptime" },
        ]}
      />

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-background relative">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-light/20 to-transparent" />
        <div className="absolute top-20 right-10 size-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-10 size-48 rounded-full bg-accent-teal/5 blur-3xl" />

        <motion.div
          className="max-w-[420px] w-full relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl btn-gradient mb-3 shadow-glow">
              <span className="text-white text-2xl font-bold font-heading">ZV</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground font-heading tracking-tight">MyZipVault</h2>
          </div>

          {/* Glass card wrapping form */}
          <div className="glass-card-static p-8 rounded-[var(--radius-xl)]">
            <div className="mb-8">
              <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                Welcome back
              </h1>
              <p className="text-text-secondary text-base mt-2">
                Sign in to your healthcare credential vault
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  disabled={isLoading}
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.email ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  disabled={isLoading}
                  className={`bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${errors.password ? "border-destructive" : ""}`}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-3 text-text-muted">or</span>
              </div>
            </div>

            <p className="text-sm text-text-secondary text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:text-primary-hover font-semibold transition-colors">
                Sign up
              </Link>
            </p>

            <p className="text-sm text-text-secondary text-center mt-3">
              Staffing agency or recruiter?{" "}
              <Link href="/agency-login" className="text-primary hover:text-primary-hover font-semibold transition-colors">
                Agency Login
              </Link>
            </p>
          </div>

          {/* Security badges */}
          <div className="mt-6 flex items-center justify-center gap-5">
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-medium">
              <ShieldCheck className="size-3" /> HIPAA
            </div>
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-medium">
              <Zap className="size-3" /> 256-bit
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
