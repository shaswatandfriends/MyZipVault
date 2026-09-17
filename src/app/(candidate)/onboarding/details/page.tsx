"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Briefcase, MapPin, Clock, HelpCircle, ArrowRight } from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY","DC",
];

const REFERRAL_SOURCES = [
  "Google search",
  "LinkedIn",
  "Facebook",
  "Instagram",
  "Twitter/X",
  "Referral from a friend/colleague",
  "Recruiter outreach",
  "Healthcare conference/event",
  "Blog article or news story",
  "Podcast",
  "Other",
];

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    specialty: "",
    city: "",
    state: "",
    zip_code: "",
    years_experience_total: "",
    years_experience_specialty: "",
    referral_source: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/candidate/onboarding-details")
      .then((r) => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.profile) {
          setForm({
            first_name: data.profile.first_name || "",
            middle_name: data.profile.middle_name || "",
            last_name: data.profile.last_name || "",
            email: data.profile.email || "",
            phone: data.profile.phone || "",
            job_title: data.profile.job_title || "",
            specialty: data.profile.specialty || "",
            city: data.profile.city || "",
            state: data.profile.state || "",
            zip_code: data.profile.zip_code || "",
            years_experience_total: data.profile.years_experience_total ?? "",
            years_experience_specialty: data.profile.years_experience_specialty ?? "",
            referral_source: data.profile.referral_source || "",
          });
        }
        // If already onboarded, redirect to dashboard
        if (data.onboarding_completed) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Show error state instead of infinite loading
        setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/candidate/onboarding-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Onboarding complete! Welcome to MyZipVault.");
      router.push("/dashboard");
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3E8]">
        <div className="flex items-center gap-3 text-[#174A43]">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm">Loading your profile...</span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3E8] px-4">
        <div className="max-w-md text-center">
          <div className="size-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="size-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-lg font-bold text-[#174A43] mb-2">Something went wrong</h2>
          <p className="text-sm text-[#5C6B66] mb-4">
            We couldn&apos;t load your profile. This might be a temporary issue.
            Please try again.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <Loader2 className="size-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3E8] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <img src="/logo.png" alt="MyZipVault" className="h-12 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-[#174A43] font-heading">
            Welcome to MyZipVault
          </h1>
          <p className="text-sm text-[#5C6B66] mt-1.5">
            Let&apos;s set up your profile. This takes about 2 minutes and unlocks
            recruiter visibility.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section 1: Personal Information ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-heading text-[#174A43]">
                <User className="size-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-xs font-semibold">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="middle_name" className="text-xs font-semibold">
                    Middle Name
                  </Label>
                  <Input
                    id="middle_name"
                    value={form.middle_name}
                    onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-xs font-semibold">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    disabled
                    className="mt-1 bg-muted/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Email is set at signup and cannot be changed here.
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    required
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Professional Information ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-heading text-[#174A43]">
                <Briefcase className="size-4" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job_title" className="text-xs font-semibold">
                    Job Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="job_title"
                    required
                    placeholder="Registered Nurse"
                    value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="specialty" className="text-xs font-semibold">
                    Specialty <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="specialty"
                    required
                    placeholder="ICU, ER, Labor & Delivery..."
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="years_experience_total" className="text-xs font-semibold">
                    <Clock className="size-3 inline mr-1" />
                    Total Years of Work Experience <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="years_experience_total"
                    required
                    type="number"
                    min="0"
                    max="80"
                    placeholder="e.g. 5"
                    value={form.years_experience_total}
                    onChange={(e) => setForm({ ...form, years_experience_total: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="years_experience_specialty" className="text-xs font-semibold">
                    <Clock className="size-3 inline mr-1" />
                    Years in Current Specialty <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="years_experience_specialty"
                    required
                    type="number"
                    min="0"
                    max="80"
                    placeholder="e.g. 3"
                    value={form.years_experience_specialty}
                    onChange={(e) => setForm({ ...form, years_experience_specialty: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 3: Location ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-heading text-[#174A43]">
                <MapPin className="size-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <Label htmlFor="city" className="text-xs font-semibold">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    required
                    placeholder="Austin"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-xs font-semibold">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => setForm({ ...form, state: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="TX" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="zip_code" className="text-xs font-semibold">
                    ZIP Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="zip_code"
                    required
                    placeholder="78701"
                    maxLength={10}
                    value={form.zip_code}
                    onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 4: Referral Source ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-heading text-[#174A43]">
                <HelpCircle className="size-4" />
                How did you hear about us?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                This is for our internal audit and marketing — it helps us understand
                what&apos;s working. Optional.
              </p>
              <Select
                value={form.referral_source}
                onValueChange={(v) => setForm({ ...form, referral_source: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between gap-3 pb-8">
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">*</span> Required fields
            </p>
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
