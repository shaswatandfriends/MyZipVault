"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, X, Loader2, DollarSign, Percent, Briefcase } from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmployerNewJobPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", profession: "", specialty: "", job_title: "",
    employment_type: "permanent", city: "", state: "", is_remote: false,
    salary_min: "", salary_max: "", salary_display: "",
    commission_type: "flat", commission_amount: "", commission_percentage: "",
    description: "", requirements: "", nice_to_have: "",
    is_public: true,
  });

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.commission_type || (form.commission_type === "flat" && !form.commission_amount) || (form.commission_type === "percentage" && !form.commission_percentage)) {
      toast.error("Commission is required — set your budget for this placement");
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch("/api/employer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          commission_type: form.commission_type,
          commission_amount: form.commission_amount || undefined,
          commission_percentage: form.commission_percentage || undefined,
          description: form.description || undefined,
          requirements: form.requirements ? form.requirements.split("\n").map((r: string) => r.trim()).filter(Boolean) : undefined,
          nice_to_have: form.nice_to_have ? form.nice_to_have.split("\n").map((r: string) => r.trim()).filter(Boolean) : undefined,
          status: "open",
          is_public: form.is_public,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Job posted!", { description: "Recruiters can now see your job and submit candidates." });
      router.push("/employer/jobs");
    } catch (err) {
      toast.error("Failed to post job", { description: err instanceof Error ? err.message : "" });
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Post a Job" description="Set your commission budget — recruiters see 70% as their commission + 30% as platform fee."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()} disabled={isSaving}><X className="size-4" />Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !form.title.trim()}>
              {isSaving ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving...</> : <><Save className="size-4 mr-2" />Post Job</>}
            </Button>
          </div>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ICU Registered Nurse — Travel Assignment" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profession">Profession</Label>
                  <Select value={form.profession} onValueChange={(v) => setForm({ ...form, profession: v })}>
                    <SelectTrigger id="profession"><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <Input id="specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="ICU, ER, Med-Surg" />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Job Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Job description, responsibilities..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requirements">Requirements (one per line)</Label>
                  <Textarea id="requirements" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={4} placeholder={"Active RN license\nBLS certification\n2+ years ICU experience"} />
                </div>
                <div>
                  <Label htmlFor="nice_to_have">Nice to Have (one per line)</Label>
                  <Textarea id="nice_to_have" value={form.nice_to_have} onChange={(e) => setForm({ ...form, nice_to_have: e.target.value })} rows={4} placeholder={"ACLS certification\nTravel experience"} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Commission — employer sets the budget */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="size-4 text-amber-600" />Commission Budget *</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="commission_type">How will you pay?</Label>
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
                  <Label htmlFor="commission_amount">Total Placement Fee ($)</Label>
                  <Input id="commission_amount" type="number" value={form.commission_amount} onChange={(e) => setForm({ ...form, commission_amount: e.target.value })} placeholder="10000" />
                  {form.commission_amount && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Recruiter gets: <strong className="text-emerald-700">${Math.round(parseFloat(form.commission_amount) * 0.7).toLocaleString()}</strong> ·
                      Platform fee: <strong className="text-amber-700">${Math.round(parseFloat(form.commission_amount) * 0.3).toLocaleString()}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <Label htmlFor="commission_percentage">Percentage of Salary (%)</Label>
                  <Input id="commission_percentage" type="number" step="0.01" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })} placeholder="15.5" />
                  <p className="text-xs text-muted-foreground mt-2">Recruiter gets 70% of the total · Platform keeps 30%</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Location & Salary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="city">City</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label htmlFor="state">State</Label><Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} maxLength={2} placeholder="TX" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_remote" checked={form.is_remote} onCheckedChange={(v) => setForm({ ...form, is_remote: v === true })} />
                <Label htmlFor="is_remote" className="text-sm cursor-pointer">Remote</Label>
              </div>
              <div>
                <Label htmlFor="salary_display">Salary Display (shown to candidates)</Label>
                <Input id="salary_display" value={form.salary_display} onChange={(e) => setForm({ ...form, salary_display: e.target.value })} placeholder="$90-110/hr or $200k" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <Checkbox id="is_public" checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v === true })} />
                <Label htmlFor="is_public" className="text-sm cursor-pointer">Public (candidates can apply directly)</Label>
              </div>
              <p className="text-xs text-muted-foreground">If public, candidates see salary only — commission is hidden.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
