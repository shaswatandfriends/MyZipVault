"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
    case "employer":
      return "/employer/dashboard";
    case "candidate":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

const trustPoints = [
  "HIPAA-aligned security architecture",
  "You control who sees your credentials",
  "Free forever for healthcare professionals",
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
        // Add a small delay to ensure the session cookie is set
        await new Promise((resolve) => setTimeout(resolve, 300));
        const sessionRes = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role || "candidate";
        const dashboard = getRoleDashboard(role);
        toast.success("Welcome back!", {
          description: "You have been signed in successfully.",
        });
        // Hard redirect — ensures session cookie is read fresh
        window.location.href = dashboard;
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Animated background — same as dashboard */}
      <div className="mesh-background" />

      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Your credentials. Your terms."
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

      {/* Right Panel - Spatial Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="max-w-[460px] w-full relative">
          {/* Mobile branding — only shown on small screens */}
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

          {/* Eyebrow — spatial pill style */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, var(--terra), transparent)" }} />
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "var(--terra)", letterSpacing: "0.2em" }}
            >
              Sign In
            </span>
          </div>

          {/* Heading — serif Lora */}
          <h1
            className="text-[2.5rem] font-bold leading-[1.1] mb-2 text-foreground"
            style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
          >
            Welcome back.
          </h1>
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--primary)" }}
          >
            Candidate & Professional Login
          </p>
          <p
            className="text-base leading-relaxed mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to your healthcare credential vault.
          </p>
          <div className="flex items-center gap-3 mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/agency-login" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Recruiter & Agency Login</Link>
            <span>·</span>
            <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Employer Login</Link>
          </div>

          {/* Form — Spatial UI */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase"
                style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
              >
                Email Address
              </label>
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
                aria-invalid={!!errors.email}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase"
                  style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "var(--primary)" }}
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                disabled={isLoading}
                aria-invalid={!!errors.password}
                autoComplete="current-password"
                maxLength={128}
              />
              {errors.password && (
                <p className="text-xs mt-1.5" style={{ color: "var(--status-red)" }}>
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full"
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

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border-strong), transparent)" }} />
            <span
              className="text-[0.6875rem] uppercase font-semibold"
              style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
            >
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border-strong), transparent)" }} />
          </div>

          {/* Sign up links */}
          <p
            className="text-[0.9375rem] text-center mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold transition-colors"
              style={{ color: "var(--primary)" }}
            >
              Sign up free
            </Link>
          </p>

          <p
            className="text-[0.9375rem] text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Staffing agency or recruiter?{" "}
            <Link
              href="/agency-login"
              className="font-semibold transition-colors"
              style={{ color: "var(--primary)" }}
            >
              Agency Login
            </Link>
          </p>

          <p
            className="text-[0.9375rem] text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Healthcare employer?{" "}
            <Link
              href="/employer-signup"
              className="font-semibold transition-colors"
              style={{ color: "var(--primary)" }}
            >
              Employer Sign Up
            </Link>
          </p>

          <p
            className="text-xs text-center mt-2"
            style={{ color: "var(--text-muted)" }}
          >
            Candidate · Recruiter · Employer — all sign in from this page
          </p>

          {/* Security badges — spatial pill */}
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
