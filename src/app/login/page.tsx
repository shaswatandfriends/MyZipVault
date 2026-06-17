"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, ShieldCheck, Lock } from "@/lib/icons";
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
    <div
      className="min-h-screen flex"
      style={{ background: "var(--editorial-cream)" }}
    >
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

      {/* Right Panel - Form */}
      <div
        className="flex-1 flex items-center justify-center p-8 md:p-12 relative"
        style={{ background: "var(--editorial-cream)" }}
      >
        <div className="max-w-[440px] w-full relative">
          {/* Mobile branding — only shown on small screens */}
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
              Sign In
            </span>
          </div>

          {/* Heading */}
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
            Welcome back.
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--editorial-ink-soft)",
              marginBottom: "2.5rem",
            }}
          >
            Sign in to your healthcare credential vault.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--editorial-ink-soft)",
                }}
              >
                Email Address
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
                style={{
                  background: "var(--editorial-paper)",
                  border: `1px solid ${errors.email ? "var(--editorial-danger)" : "var(--editorial-rule)"}`,
                  borderRadius: "2px",
                  height: "48px",
                  color: "var(--editorial-ink)",
                  fontSize: "0.9375rem",
                }}
                autoComplete="email"
              />
              {errors.email && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger)", marginTop: "0.25rem" }}>
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Label
                  htmlFor="password"
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--editorial-ink-soft)",
                  }}
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--editorial-navy)",
                    textDecoration: "none",
                    fontWeight: 500,
                    borderBottom: "1px solid var(--editorial-gold)",
                    paddingBottom: "1px",
                    transition: "color 150ms",
                  }}
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
                style={{
                  background: "var(--editorial-paper)",
                  border: `1px solid ${errors.password ? "var(--editorial-danger)" : "var(--editorial-rule)"}`,
                  borderRadius: "2px",
                  height: "48px",
                  color: "var(--editorial-ink)",
                  fontSize: "0.9375rem",
                }}
                autoComplete="current-password"
              />
              {errors.password && (
                <p style={{ fontSize: "0.75rem", color: "var(--editorial-danger)", marginTop: "0.25rem" }}>
                  {errors.password}
                </p>
              )}
            </div>

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
                background: "var(--editorial-navy)",
                color: "var(--editorial-cream)",
                fontSize: "0.875rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "1px solid var(--editorial-navy)",
                borderRadius: "2px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              margin: "2rem 0",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--editorial-rule)" }} />
            <span
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--editorial-ink-muted)",
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--editorial-rule)" }} />
          </div>

          {/* Sign up link */}
          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--editorial-ink-soft)",
              textAlign: "center",
              marginBottom: "0.75rem",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "var(--editorial-navy)",
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "1px solid var(--editorial-gold)",
                paddingBottom: "1px",
              }}
            >
              Sign up free
            </Link>
          </p>

          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--editorial-ink-soft)",
              textAlign: "center",
            }}
          >
            Staffing agency or recruiter?{" "}
            <Link
              href="/agency-login"
              style={{
                color: "var(--editorial-navy)",
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "1px solid var(--editorial-gold)",
                paddingBottom: "1px",
              }}
            >
              Agency Login
            </Link>
          </p>

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
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Icon
                  className="size-3.5"
                  style={{ color: "var(--editorial-gold-dark)" }}
                />
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
        </div>
      </div>
    </div>
  );
}
