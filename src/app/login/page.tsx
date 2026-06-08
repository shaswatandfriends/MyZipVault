"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#166534] to-[#0D9488] min-h-screen items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl mb-0">
            <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-4xl font-bold">ZV</span>
          </div>
          <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[28px] font-bold text-white mt-4">MyZipVault</h2>
          <p className="text-white/75 text-base mt-2" style={{ fontFamily: "Inter, sans-serif" }}>Healthcare credential verification, simplified</p>
          <div className="mt-12 space-y-4">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center justify-center gap-3 text-white/70 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                <Check className="size-4 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-[#F8F7F4]">
        <div className="max-w-[400px] w-full">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#166534] rounded-2xl mb-3">
              <span style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-white text-2xl font-bold">ZV</span>
            </div>
            <h2 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-2xl font-bold text-[#111827]">MyZipVault</h2>
          </div>

          <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
            Welcome back
          </h1>
          <p className="text-[#6B7280] text-base mt-2 mb-8">
            Sign in to your healthcare credential vault
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
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
                className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.email ? "border-destructive" : ""}`}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#0D9488] hover:underline"
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
                className={`bg-white border-[#E5E7EB] rounded-xl p-3.5 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] ${errors.password ? "border-destructive" : ""}`}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
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
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E5E7EB]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F8F7F4] px-3 text-[#9CA3AF]">or</span>
            </div>
          </div>

          <p className="text-sm text-[#6B7280] text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#0D9488] hover:underline font-medium">
              Sign up
            </Link>
          </p>

          <p className="text-sm text-[#6B7280] text-center mt-3">
            Staffing agency or recruiter?{" "}
            <Link href="/agency-login" className="text-[#0D9488] hover:underline font-medium">
              Agency Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
