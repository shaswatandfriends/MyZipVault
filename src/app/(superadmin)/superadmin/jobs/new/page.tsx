"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Briefcase,
  Save,
  X,
  Loader2,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewJobPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    profession: "",
    specialty: "",
    job_title: "",
    employment_type: "permanent",
    city: "",
    state: "",
    is_remote: false,
    salary_min: "",
    salary_max: "",
    salary_display: "",
    commission_type: "flat",
    commission_amount: "",
    commission_percentage: "",
    description: "",
    requirements: "",
    nice_to_have: "",
    status: "draft",
    is_public: false,
    open_date: "",
    close_date: "",
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      setIsSaving(true);
      const body: Record<string, unknown> = {
        title: form.title,
        profession: form.profession || undefined,
        specialty: form.specialty || undefined,
        job_title: form.job_title || undefined,
        employment_type: form.employment_type || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        is_remote: form.is_remote,
        salary_min: form.salary_min || undefined,
        salary_max: form.salary_max || undefined,
        salary_display: form.salary_display || undefined,
        commission_type: form.commission_type || undefined,
        commission_amount: form.commission_amount || undefined,
        commission_percentage: form.commission_percentage || undefined,
        description: form.description || undefined,
        requirements: form.requirements ? form.requirements.split("\n").map((r) => r.trim()).filter(Boolean) : undefined,
        nice_to_have: form.nice_to_have ? form.nice_to_have.split("\n").map((r) => r.trim()).filter(Boolean) : undefined,
        status: form.status,
        is_public: form.is_public,
        open_date: form.open_date || undefined,
        close_date: form.close_date || undefined,
      };

      const res = await fetch("/api/superadmin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create job");

      toast.success("Job created", { description: form.status === "open" ? "Job is now live for recruiters." : "Saved as draft." });
      router.push("/superadmin/jobs");
    } catch (err) {
      toast.error("Failed to create job", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Job Posting"
        description="Create a new job opening. Set it as 'Draft' to save without showing to recruiters, or 'Open' to publish immediately."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()} disabled={isSaving}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !form.title.trim()}>
              {isSaving ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving...</> : <><Save className="size-4 mr-2" />Save Job</>}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., ICU Registered Nurse — Travel Assignment" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profession">Profession</Label>
                  <Select value={form.profession} onValueChange={(v) => setForm({ ...form, profession: v })}>
                    <SelectTrigger id="profession"><SelectValue placeholder="Select profession" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nursing">Nursing</SelectItem>
                      <SelectItem value="allied">Allied Health</SelectItem>
                      <SelectItem value="physician">Physician</SelectItem>
                      <SelectItem value="non-clinical">Non-Clinical</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input id="specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g., ICU, ER, Med-Surg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job_title">Job Title (specific role)</Label>
                  <Input id="job_title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="e.g., Travel RN" />
                </div>
                <div>
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                    <SelectTrigger id="employment_type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="per_diem">Per Diem</SelectItem>
                      <SelectItem value="locum">Locum Tenens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Job description, responsibilities, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requirements">Requirements (one per line)</Label>
                  <Textarea id="requirements" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={4} placeholder={"Active RN license\nBLS certification\n2+ years ICU experience"} />
                </div>
                <div>
                  <Label htmlFor="nice_to_have">Nice to Have (one per line)</Label>
                  <Textarea id="nice_to_have" value={form.nice_to_have} onChange={(e) => setForm({ ...form, nice_to_have: e.target.value })} rows={4} placeholder={"ACLS certification\nPrevious travel experience"} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status & Visibility</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (not visible)</SelectItem>
                    <SelectItem value="open">Open (visible to recruiters)</SelectItem>
                    <SelectItem value="paused">Paused (temporarily hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_public" checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v === true })} />
                <Label htmlFor="is_public" className="text-sm cursor-pointer">Public (candidates can browse + apply directly)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                If public, candidates see only the salary display — commission info is hidden from candidates.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="open_date">Open Date</Label>
                  <Input id="open_date" type="date" value={form.open_date} onChange={(e) => setForm({ ...form, open_date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="close_date">Close Date</Label>
                  <Input id="close_date" type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="TX" maxLength={2} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_remote" checked={form.is_remote} onCheckedChange={(v) => setForm({ ...form, is_remote: v === true })} />
                <Label htmlFor="is_remote" className="text-sm cursor-pointer">Remote / Work from anywhere</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Compensation (recruiter-side)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="salary_display">Salary Display (shown to candidates)</Label>
                <Input id="salary_display" value={form.salary_display} onChange={(e) => setForm({ ...form, salary_display: e.target.value })} placeholder="e.g., $200k or $90-110/hr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="salary_min">Salary Min ($)</Label>
                  <Input id="salary_min" type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="salary_max">Salary Max ($)</Label>
                  <Input id="salary_max" type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Commission (recruiter-side)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="commission_type">Commission Type</Label>
                <Select value={form.commission_type} onValueChange={(v) => setForm({ ...form, commission_type: v, commission_amount: "", commission_percentage: "" })}>
                  <SelectTrigger id="commission_type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Fee ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.commission_type === "flat" ? (
                <div>
                  <Label htmlFor="commission_amount">Flat Amount ($)</Label>
                  <Input id="commission_amount" type="number" value={form.commission_amount} onChange={(e) => setForm({ ...form, commission_amount: e.target.value })} placeholder="e.g., 5000" />
                </div>
              ) : (
                <div>
                  <Label htmlFor="commission_percentage">Percentage (%)</Label>
                  <Input id="commission_percentage" type="number" step="0.01" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })} placeholder="e.g., 15.5" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Standard split: 70% recruiter / 30% platform. During 90-day exclusive window: 75/25. During 90-180 day residual: 68/30/2.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
