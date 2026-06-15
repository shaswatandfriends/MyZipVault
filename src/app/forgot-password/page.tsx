"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Mail, ArrowRight, ArrowLeft, ShieldCheck, Zap } from "@/lib/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

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
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Healthcare credential verification, simplified"
        trustPoints={trustPoints}
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
            {isSubmitted ? (
              <>
                <div className="flex items-center justify-center size-16 bg-primary-light rounded-2xl mb-6">
                  <Mail className="size-8 text-primary" />
                </div>
                <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                  Check your email
                </h1>
                <p className="text-text-secondary text-base mt-2 mb-8">
                  If an account with that email exists, we&apos;ve sent a reset link. Please check your inbox and spam folder.
                </p>
                <Link href="/login">
                  <Button className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base">
                    Back to Sign In
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                    Forgot password?
                  </h1>
                  <p className="text-text-secondary text-base mt-2">
                    No worries, we&apos;ll send you a reset link.
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

                  <Button
                    type="submit"
                    className="btn-gradient w-full gap-2 py-3.5 rounded-xl font-semibold text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
                  >
                    <ArrowLeft className="size-4" />
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
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
