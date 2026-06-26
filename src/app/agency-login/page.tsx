"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck, Lock } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

const trustPoints = [
  "Real-time candidate tracking",
  "Credit-based pricing — pay only for what you use",
  "HIPAA-aligned security architecture",
];

export default function AgencyLoginPage() {
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
      const isApproved = sessionData?.user?.isApproved as boolean | undefined;

      if (role !== "client_admin" && role !== "client_recruiter") {
        toast.error("Access denied", {
          description:
            "This portal is for staffing agencies and recruiters only. Use the candidate login instead.",
        });
        await signOut({ redirect: false });
        return;
      }

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
    <div className="min-h-screen flex relative">
      <div className="mesh-background" />

      <AuthSlideshowPanel
        tagline="For staffing agencies & healthcare recruiters."
        trustPoints={trustPoints}
        quoteCard={{
          text: "We cut our credential verification time by 80%. Real-time tracking means we never lose sight of a candidate's status.",
          attribution: "Jessica R., Director of Nursing Services",
        }}
        statsCard={[
          { value: "500+", label: "Agencies" },
          { value: "50K+", label: "Verifications" },
          { value: "98%", label: "Satisfaction" },
        ]}
      />

      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="max-w-[460px] w-full relative">
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
              Agency Portal
            </span>
          </div>

          <h1
            className="text-[2.5rem] font-bold leading-[1.1] mb-3 text-foreground"
            style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
          >
            Welcome back.
          </h1>
          <p
            className="text-base leading-relaxed mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to your staffing agency or recruiter account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase"
                style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
              >
                Work Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@agency.com"
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

          <p
            className="text-[0.9375rem] text-center mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Don&apos;t have an account?{" "}
            <Link href="/agency-signup" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Register your agency
            </Link>
          </p>

          <p
            className="text-[0.9375rem] text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Healthcare professional?{" "}
            <Link href="/login" className="font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              Candidate Login
            </Link>
          </p>

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

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="size-4" />
              Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
