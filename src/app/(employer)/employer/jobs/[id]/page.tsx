"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Save, X, Loader2, DollarSign, Percent, Trash2 } from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployerEditJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const fetchJob = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/employer/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const j = data.job;
      setForm({
        title: j.title ?? "", profession: j.profession ?? "", specialty: j.specialty ?? "",
        job_title: j.job_title ?? "", employment_type: j.employment_type ?? "permanent",
        city: j.city ?? "", state: j.state ?? "", is_remote: j.is_remote ?? false,
        salary_min: j.salary_min ?? "", salary_max: j.salary_max ?? "",
        salary_display: j.salary_display ?? "",
        commission_type: j.commission_type ?? "flat",
        commission_amount: j.commission_amount ?? "", commission_percentage: j.commission_percentage ?? "",
        description: j.description ?? "",
        requirements: j.requirements ? JSON.parse(j.requirements).join("\n") : "",
        nice_to_have: j.nice_to_have ? JSON.parse(j.nice_to_have).join("\n") : "",
        status: j.status ?? "open", is_public: j.is_public ?? true,
      });
    } catch { toast.error("Failed to load job"); router.push("/employer/jobs"); }
    finally { setIsLoading(false); }
  }, [jobId, router]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const body: Record<string, unknown> = {
        title: form.title, profession: form.profession || undefined,
        specialty: form.specialty || undefined, job_title: form.job_title || undefined,
        employment_type: form.employment_type || undefined,
        city: form.city || undefined, state: form.state || undefined,
        is_remote: form.is_remote, salary_display: form.salary_display || undefined,
        commission_type: form.commission_type || undefined,
        commission_amount: form.commission_amount || undefined,
        commission_percentage: form.commission_percentage || undefined,
        description: form.description || undefined,
        requirements: form.requirements ? String(form.requirements).split("\n").map((r: string) => r.trim()).filter(Boolean) : undefined,
        nice_to_have: form.nice_to_have ? String(form.nice_to_have).split("\n").map((r: string) => r.trim()).filter(Boolean) : undefined,
        status: form.status, is_public: form.is_public,
      };
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Job updated");
      router.push("/employer/jobs");
    } catch { toast.error("Failed to update"); }
    finally { setIsSaving(false); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this job? Existing submissions are preserved.")) return;
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Job cancelled");
      router.push("/employer/jobs");
    } catch { toast.error("Failed to cancel"); }
  };

  if (isLoading) {
    return <div className="space-y-6"><PageHeader title="Edit Job" description="Loading..." /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Job" description="Update job details, commission, or cancel the job."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()} disabled={isSaving}><X className="size-4" />Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={isSaving || form.status === "cancelled"}><Trash2 className="size-4 mr-2" />Cancel Job</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !form.title}>
              {isSaving ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving...</> : <><Save className="size-4 mr-2" />Save Changes</>}
            </Button>
          </div>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="title">Title *</Label><Input id="title" value={form.title as string ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="profession">Profession</Label>
                  <Select value={form.profession as string ?? ""} onValueChange={(v) => setForm({ ...form, profession: v })}>
                    <SelectTrigger id="profession"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nursing">Nursing</SelectItem><SelectItem value="allied">Allied Health</SelectItem>
                      <SelectItem value="physician">Physician</SelectItem><SelectItem value="non-clinical">Non-Clinical</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="specialty">Specialty</Label><Input id="specialty" value={form.specialty as string ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
              </div>
              <div><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description as string ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="requirements">Requirements (one per line)</Label><Textarea id="requirements" value={form.requirements as string ?? ""} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={4} /></div>
                <div><Label htmlFor="nice_to_have">Nice to Have (one per line)</Label><Textarea id="nice_to_have" value={form.nice_to_have as string ?? ""} onChange={(e) => setForm({ ...form, nice_to_have: e.target.value })} rows={4} /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="size-4 text-amber-600" />Commission</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Commission Type</Label>
                <Select value={form.commission_type as string ?? "flat"} onValueChange={(v) => setForm({ ...form, commission_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="flat">Flat Fee ($)</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent>
                </Select>
              </div>
              {form.commission_type === "flat" ? (
                <div>
                  <Label htmlFor="commission_amount">Total Fee ($)</Label>
                  <Input id="commission_amount" type="number" value={String(form.commission_amount ?? "")} onChange={(e) => setForm({ ...form, commission_amount: e.target.value })} />
                  {form.commission_amount && <p className="text-xs text-muted-foreground mt-2">Recruiter: <strong className="text-emerald-700">${Math.round(parseFloat(String(form.commission_amount)) * 0.7).toLocaleString()}</strong> · Platform: <strong className="text-amber-700">${Math.round(parseFloat(String(form.commission_amount)) * 0.3).toLocaleString()}</strong></p>}
                </div>
              ) : (
                <div>
                  <Label htmlFor="commission_percentage">Percentage (%)</Label>
                  <Input id="commission_percentage" type="number" step="0.01" value={String(form.commission_percentage ?? "")} onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Location & Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="city">City</Label><Input id="city" value={form.city as string ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label htmlFor="state">State</Label><Input id="state" value={form.state as string ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_remote" checked={form.is_remote as boolean ?? false} onCheckedChange={(v) => setForm({ ...form, is_remote: v === true })} />
                <Label htmlFor="is_remote" className="text-sm cursor-pointer">Remote</Label>
              </div>
              <div>
                <Label>Salary Display</Label>
                <Input value={form.salary_display as string ?? ""} onChange={(e) => setForm({ ...form, salary_display: e.target.value })} placeholder="$200k" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status as string ?? "open"} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem><SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_public" checked={form.is_public as boolean ?? false} onCheckedChange={(v) => setForm({ ...form, is_public: v === true })} />
                <Label htmlFor="is_public" className="text-sm cursor-pointer">Public (candidates can apply)</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
