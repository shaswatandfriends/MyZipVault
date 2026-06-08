"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, Mail, ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const trustPoints = [
  "HIPAA-Aligned Security",
  "You Control Access",
  "100% Free for Nurses",
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Error", {
          description: data.error || "Something went wrong. Please try again.",
        });
        return;
      }

      setIsSubmitted(true);
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

          {isSubmitted ? (
            <>
              <div className="flex items-center justify-center w-16 h-16 bg-[#CCFBF1] rounded-2xl mb-6">
                <Mail className="size-8 text-[#0D9488]" />
              </div>
              <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
                Check your email
              </h1>
              <p className="text-[#6B7280] text-base mt-2 mb-8">
                If an account with that email exists, we&apos;ve sent a reset link. Please check your inbox and spam folder.
              </p>
              <Link href="/login">
                <Button className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all">
                  Back to Sign In
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Clash Display', sans-serif" }} className="text-[36px] font-bold text-[#111827] leading-tight">
                Forgot password?
              </h1>
              <p className="text-[#6B7280] text-base mt-2 mb-8">
                No worries, we&apos;ll send you a reset link.
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

                <Button
                  type="submit"
                  className="w-full bg-[#166534] text-white py-3.5 rounded-xl font-medium hover:bg-[#14532D] hover:-translate-y-px hover:shadow-md transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-[#0D9488] hover:underline font-medium"
                >
                  <ArrowLeft className="size-4" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
