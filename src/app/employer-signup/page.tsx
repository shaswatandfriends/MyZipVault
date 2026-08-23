"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Briefcase, ArrowRight, CheckCircle2, Building2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EmployerSignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
    companyAddress: "",
    companyWebsite: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.firstName || !form.lastName || !form.companyName) {
      toast.error("Please fill all required fields");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters with uppercase, lowercase, and a number");
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/employer-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      toast.success("Account created!", { description: "Check your email to verify your account." });
      router.push("/login");
    } catch (err) {
      toast.error("Signup failed", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(160deg, #0B162A 0%, #004182 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #0A66C2, #004182)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 20 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 20, color: "white" }}>MyZipVault</span>
        </Link>

        <div className="rounded-2xl bg-white shadow-xl p-8">
          <div className="text-center mb-6">
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#EAF3FB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Building2 size={28} style={{ color: "#0A66C2" }} />
            </div>
            <h1 className="text-2xl font-bold text-[#111827]">Employer Sign Up</h1>
            <p className="text-sm font-semibold mt-2" style={{ color: "#0A66C2" }}>Employer Login & Sign Up</p>
            <p className="text-sm text-[#6B7280] mt-1">Post jobs, set your commission budget, and receive candidates from our recruiter network.</p>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-[#6B7280]">
              <Link href="/signup" className="font-medium hover:underline" style={{ color: "#0A66C2" }}>Candidate & Professional Sign Up</Link>
              <span>·</span>
              <Link href="/agency-signup" className="font-medium hover:underline" style={{ color: "#0A66C2" }}>Recruiter & Agency Sign Up</Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="General Hospital" required />
            </div>
            <div>
              <Label htmlFor="email">Work Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@hospital.com" required />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars, upper + lower + number" required />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
            </div>
            <div>
              <Label htmlFor="companyWebsite">Company Website (optional)</Label>
              <Input id="companyWebsite" value={form.companyWebsite} onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })} placeholder="www.hospital.com" />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Creating account...</>
              ) : (
                <>Create Employer Account <ArrowRight className="size-4 ml-2" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-center gap-4 text-xs text-[#6B7280]">
              <span className="flex items-center gap-1"><CheckCircle2 size={14} style={{ color: "#0A66C2" }} /> HIPAA-aligned</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} style={{ color: "#0A66C2" }} /> BAA available</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} style={{ color: "#0A66C2" }} /> No upfront cost</span>
            </div>
          </div>

          <p className="text-center text-sm text-[#6B7280] mt-4">
            Already have an account? <Link href="/login" className="text-[#0A66C2] font-semibold">Sign in</Link>
          </p>
          <p className="text-center text-sm text-[#6B7280] mt-2">
            <Link href="/signup" className="text-[#6B7280] hover:text-[#0A66C2]">I'm a Candidate</Link>
            {" · "}
            <Link href="/agency-signup" className="text-[#6B7280] hover:text-[#0A66C2]">I'm a Recruiter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
