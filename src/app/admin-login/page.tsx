"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ShieldCheck, Zap } from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import AuthSlideshowPanel from "@/components/auth/AuthSlideshowPanel";

const trustPoints = [
  "Secure Admin Access",
  "Role-Based Controls",
  "Audit Logging",
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      // Sign out any existing session first to allow role switching
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials", {
          description: "Please check your email and password",
        });
        return;
      }

      // Verify admin role
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = (session?.user as Record<string, unknown>)?.role;

      if (role !== "platform_admin" && role !== "client_admin" && role !== "client_recruiter") {
        toast.error("Access denied", {
          description: "This portal is for administrators only",
        });
        await signOut({ redirect: false });
        return;
      }

      // Check approval status for client roles
      const isApproved = (session?.user as Record<string, unknown>)?.isApproved;
      if ((role === "client_admin" || role === "client_recruiter") && isApproved === false) {
        toast.error("Account pending approval", {
          description: "Your account is awaiting admin approval. You will be notified once approved.",
          duration: 8000,
        });
        await signOut({ redirect: false });
        return;
      }

      // Role-based redirect
      let dashboard = "/admin/dashboard";
      if (role === "client_admin" || role === "client_recruiter") {
        dashboard = "/recruiter/dashboard";
      }

      toast.success("Signed in successfully!");
      router.push(dashboard);
    } catch {
      toast.error("Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Slideshow */}
      <AuthSlideshowPanel
        tagline="Platform Administration"
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
            <div className="mb-8">
              <h1 className="text-[32px] font-bold text-foreground font-heading tracking-tight leading-tight">
                Admin Portal
              </h1>
              <p className="text-text-secondary text-base mt-2">
                Sign in to the platform administration portal
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
                  placeholder="admin@myzipvault.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-surface border-border rounded-xl h-11 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  autoComplete="current-password"
                />
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

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
            >
              &larr; Back to main site
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
