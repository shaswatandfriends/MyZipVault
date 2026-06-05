"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[440px]">
        <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/40">
          <CardHeader className="space-y-1.5 px-6 pt-6 pb-0 text-center">
            <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Shield className="size-7 text-slate-600 dark:text-slate-300" />
            </div>
            <CardTitle className="text-xl">Admin Portal</CardTitle>
            <CardDescription className="text-sm">
              Sign in to the platform administration portal
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@myzipvault.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            <div className="mt-5 text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                &larr; Back to main site
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
