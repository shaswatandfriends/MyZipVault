"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

const trustPoints = [
  "Document verification queue access",
  "User management with granular controls",
  "Full audit trail of every action",
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      await signOut({ redirect: false });

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

      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role as string | undefined;

      if (role !== "platform_admin" && role !== "super_admin") {
        toast.error("Access denied", {
          description: "This portal is for platform administrators only.",
        });
        await signOut({ redirect: false });
        return;
      }

      if (role === "super_admin") {
        router.push("/superadmin/dashboard");
      } else {
        router.push("/admin/dashboard");
      }
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--editorial-paper)",
    border: "1px solid var(--editorial-rule)",
    borderRadius: "2px",
    height: "48px",
    color: "var(--editorial-ink)",
    fontSize: "0.9375rem",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--editorial-ink-soft)",
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--editorial-cream)" }}
    >
      <AuthSlideshowPanel
        tagline="Platform administration portal."
        trustPoints={trustPoints}
        quoteCard={{
          text: "MyZipVault's admin tools give us complete visibility. We can verify docs, manage users, and audit everything from one place.",
          attribution: "Internal Admin Team",
        }}
        statsCard={[
          { value: "24/7", label: "Monitoring" },
          { value: "100%", label: "Audit Trail" },
          { value: "< 5min", label: "Avg Verify" },
        ]}
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
              Admin Portal
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
            Administration.
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--editorial-ink-soft)",
              marginBottom: "2.5rem",
            }}
          >
            Sign in to the platform administration portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" style={labelStyle}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@myzipvault.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" style={labelStyle}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
                autoComplete="current-password"
              />
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

          {/* Back link */}
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
