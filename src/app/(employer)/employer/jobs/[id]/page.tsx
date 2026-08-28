"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Save, X, Loader2, DollarSign, Percent, Trash2, Eye, ExternalLink,
  Briefcase, Users, Calendar, BarChart3, AlertTriangle, MapPin,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── US states for the dropdown ─────────────────────────────────────
const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }, { value: "DC", label: "District of Columbia" },
];

// ─── Types ──────────────────────────────────────────────────────────
interface JobStats {
  submissions_count: number;
  applications_count: number;
  views_count: number;
  created_at: string;
  status: string;
}

interface FormData {
  title: string;
  profession: string;
  specialty: string;
  job_title: string;
  employment_type: string;
  city: string;
  state: string;
  is_remote: boolean;
  salary_min: string;
  salary_max: string;
  salary_display: string;
  commission_type: string;
  commission_amount: string;
  commission_percentage: string;
  description: string;
  requirements: string;
  nice_to_have: string;
  status: string;
  is_public: boolean;
}

// ─── Component ──────────────────────────────────────────────────────
export default function EmployerEditJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancellingJob, setIsCancellingJob] = useState(false);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialForm, setInitialForm] = useState<FormData | null>(null);
  const [form, setForm] = useState<FormData>({
    title: "", profession: "", specialty: "", job_title: "",
    employment_type: "permanent", city: "", state: "", is_remote: false,
    salary_min: "", salary_max: "", salary_display: "",
    commission_type: "flat", commission_amount: "", commission_percentage: "",
    description: "", requirements: "", nice_to_have: "",
    status: "open", is_public: true,
  });
  const formRef = useRef(form);
  formRef.current = form;

  const fetchJob = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/employer/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const j = data.job;
      const formData: FormData = {
        title: j.title ?? "", profession: j.profession ?? "", specialty: j.specialty ?? "",
        job_title: j.job_title ?? "", employment_type: j.employment_type ?? "permanent",
        city: j.city ?? "", state: j.state ?? "", is_remote: j.is_remote ?? false,
        salary_min: j.salary_min ? String(j.salary_min) : "",
        salary_max: j.salary_max ? String(j.salary_max) : "",
        salary_display: j.salary_display ?? "",
        commission_type: j.commission_type ?? "flat",
        commission_amount: j.commission_amount ? String(j.commission_amount) : "",
        commission_percentage: j.commission_percentage ? String(j.commission_percentage) : "",
        description: j.description ?? "",
        requirements: j.requirements ? JSON.parse(j.requirements).join("\n") : "",
        nice_to_have: j.nice_to_have ? JSON.parse(j.nice_to_have).join("\n") : "",
        status: j.status ?? "open", is_public: j.is_public ?? true,
      };
      setForm(formData);
      setInitialForm(formData);
      setStats({
        submissions_count: j.submissions_count ?? 0,
        applications_count: j.applications_count ?? 0,
        views_count: j.views_count ?? 0,
        created_at: j.created_at,
        status: j.status,
      });
    } catch {
      toast.error("Failed to load job");
      router.push("/employer/jobs");
    } finally {
      setIsLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  // ─── Unsaved changes warning on navigation ───
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (initialForm && JSON.stringify(initialForm) !== JSON.stringify(formRef.current)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [initialForm]);

  // ─── Cmd/Ctrl+S keyboard shortcut ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hasUnsavedChanges = initialForm ? JSON.stringify(initialForm) !== JSON.stringify(form) : false;

  // ─── Validation ───
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Job title is required";
    if (form.commission_type === "flat") {
      if (!form.commission_amount || parseFloat(form.commission_amount) <= 0) {
        newErrors.commission_amount = "Commission amount must be greater than 0";
      }
    } else if (form.commission_type === "percentage") {
      const pct = parseFloat(form.commission_percentage);
      if (!form.commission_percentage || isNaN(pct) || pct <= 0 || pct > 100) {
        newErrors.commission_percentage = "Percentage must be between 0 and 100";
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors before saving", {
        description: Object.values(newErrors)[0],
      });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
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
        requirements: form.requirements
          ? String(form.requirements).split("\n").map((r: string) => r.trim()).filter(Boolean)
          : undefined,
        nice_to_have: form.nice_to_have
          ? String(form.nice_to_have).split("\n").map((r: string) => r.trim()).filter(Boolean)
          : undefined,
        status: form.status,
        is_public: form.is_public,
      };
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Job updated", {
        description: "Your changes have been saved.",
      });
      setInitialForm(form); // mark as saved
      router.push("/employer/jobs");
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCancelJob = async () => {
    try {
      setIsCancellingJob(true);
      const res = await fetch(`/api/employer/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Job cancelled", {
        description: "The job is no longer accepting new submissions. Existing submissions are preserved.",
      });
      router.push("/employer/jobs");
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setIsCancellingJob(false);
      setCancelDialogOpen(false);
    }
  };

  // ─── Helpers ───
  const formatDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const commissionPreview = () => {
    if (form.commission_type === "flat" && form.commission_amount) {
      const total = parseFloat(form.commission_amount);
      if (isNaN(total) || total <= 0) return null;
      const recruiter = Math.round(total * 0.70);
      const platform = Math.round(total * 0.30);
      return { total, recruiter, platform };
    }
    return null;
  };

  const preview = commissionPreview();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Job" description="Loading…" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isCancelled = stats?.status === "cancelled";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Job"
        description="Update job details, commission, or cancel the job."
        actions={
          <div className="flex items-center gap-2">
            {/* Preview public listing */}
            <Link href={`/browse-jobs/${jobId}`} target="_blank">
              <Button variant="ghost" size="sm" disabled={isCancelled}>
                <Eye className="size-4" /> Preview <ExternalLink className="size-3" />
              </Button>
            </Link>
            {/* Back (was confusingly called "Cancel") */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges && !confirm("Discard unsaved changes?")) return;
                router.push("/employer/jobs");
              }}
              disabled={isSaving}
            >
              <X className="size-4" /> Back
            </Button>
            {/* Save (with Cmd+S hint) */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !form.title || isCancelled}
              title="Save changes (Ctrl/Cmd+S)"
            >
              {isSaving ? (
                <><Loader2 className="size-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="size-4" /> Save changes</>
              )}
            </Button>
          </div>
        }
      />

      {/* ─── Job stats banner ─── */}
      {stats && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-text-muted" />
                <span className="text-text-muted">Posted</span>
                <span className="font-medium text-foreground">{formatDate(stats.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-text-muted" />
                <span className="text-text-muted">Views</span>
                <span className="font-bold text-foreground">{stats.views_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-text-muted" />
                <span className="text-text-muted">Applications</span>
                <span className="font-bold text-foreground">{stats.applications_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-text-muted" />
                <span className="text-text-muted">Recruiter submissions</span>
                <span className="font-bold text-foreground">{stats.submissions_count.toLocaleString()}</span>
              </div>
              <Badge variant="outline" className={
                stats.status === "open" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : stats.status === "paused" ? "bg-amber-50 text-amber-700 border-amber-200"
                : stats.status === "filled" ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
              }>
                {stats.status}
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-auto">
                  <AlertTriangle className="size-3" /> Unsaved changes
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled job banner */}
      {isCancelled && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900">This job has been cancelled</p>
            <p className="text-sm text-rose-700 mt-1">
              You can still view the job details below, but no new submissions can be made.
              Existing submissions are preserved.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Job details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="size-4 text-primary" /> Job details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Job title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: "" });
                  }}
                  aria-invalid={!!errors.title}
                  disabled={isCancelled}
                />
                {errors.title && (
                  <p className="text-xs text-rose-600 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Profession + Specialty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="profession">Profession</Label>
                  <Select
                    value={form.profession}
                    onValueChange={(v) => setForm({ ...form, profession: v })}
                    disabled={isCancelled}
                  >
                    <SelectTrigger id="profession">
                      <SelectValue placeholder="Select profession" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nursing">Nursing</SelectItem>
                      <SelectItem value="allied">Allied Health</SelectItem>
                      <SelectItem value="physician">Physician</SelectItem>
                      <SelectItem value="advanced_practice">Advanced Practice</SelectItem>
                      <SelectItem value="therapy">Therapy</SelectItem>
                      <SelectItem value="non-clinical">Non-Clinical</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input
                    id="specialty"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    placeholder="e.g., ICU, Med-Surg, ER"
                    disabled={isCancelled}
                  />
                </div>
              </div>

              {/* Job title (target role) */}
              <div>
                <Label htmlFor="job_title">Target job title (optional)</Label>
                <Input
                  id="job_title"
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  placeholder="e.g., Travel RN, Locum Hospitalist"
                  disabled={isCancelled}
                />
                <p className="text-xs text-text-muted mt-1">
                  The specific job title candidates will see (different from the listing title).
                </p>
              </div>

              {/* Employment type */}
              <div>
                <Label>Employment type</Label>
                <Select
                  value={form.employment_type}
                  onValueChange={(v) => setForm({ ...form, employment_type: v })}
                  disabled={isCancelled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="per_diem">Per Diem</SelectItem>
                    <SelectItem value="locum">Locum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  placeholder="Describe the role, responsibilities, and team. This is what candidates will read first."
                  disabled={isCancelled}
                />
              </div>

              {/* Requirements + Nice to have */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requirements">Requirements (one per line)</Label>
                  <Textarea
                    id="requirements"
                    value={form.requirements}
                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                    rows={5}
                    placeholder={"Active RN license\nBLS certification\n2+ years experience"}
                    disabled={isCancelled}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    {form.requirements.split("\n").filter((r) => r.trim()).length} requirement(s)
                  </p>
                </div>
                <div>
                  <Label htmlFor="nice_to_have">Nice to have (one per line)</Label>
                  <Textarea
                    id="nice_to_have"
                    value={form.nice_to_have}
                    onChange={(e) => setForm({ ...form, nice_to_have: e.target.value })}
                    rows={5}
                    placeholder={"ACLS certification\nPrior travel experience\nBilingual"}
                    disabled={isCancelled}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    {form.nice_to_have.split("\n").filter((r) => r.trim()).length} nice-to-have item(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Commission + Location + Status */}
        <div className="space-y-6">
          {/* Commission */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="size-4 text-amber-600" /> Commission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Commission type</Label>
                <Select
                  value={form.commission_type}
                  onValueChange={(v) => setForm({ ...form, commission_type: v })}
                  disabled={isCancelled}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat fee ($)</SelectItem>
                    <SelectItem value="percentage">Percentage of salary (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.commission_type === "flat" ? (
                <div>
                  <Label htmlFor="commission_amount">Total fee ($)</Label>
                  <Input
                    id="commission_amount"
                    type="number"
                    value={form.commission_amount}
                    onChange={(e) => {
                      setForm({ ...form, commission_amount: e.target.value });
                      if (errors.commission_amount) setErrors({ ...errors, commission_amount: "" });
                    }}
                    placeholder="10000"
                    aria-invalid={!!errors.commission_amount}
                    disabled={isCancelled}
                  />
                  {errors.commission_amount && (
                    <p className="text-xs text-rose-600 mt-1">{errors.commission_amount}</p>
                  )}
                  {preview && (
                    <div className="mt-3 rounded-lg border border-border bg-surface p-3">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                        How recruiters see this
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Recruiter commission</span>
                          <span className="font-bold text-emerald-700">${preview.recruiter.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Platform fee</span>
                          <span className="font-bold text-amber-700">${preview.platform.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-border">
                          <span className="text-text-secondary font-medium">You pay</span>
                          <span className="font-bold text-foreground">${preview.total.toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-text-muted mt-2">
                        70/30 standard split. In residual phase (90-180 days after candidate was added),
                        split becomes 68/30/2 — you still pay the same total.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="commission_percentage">Percentage (%)</Label>
                    <Input
                      id="commission_percentage"
                      type="number"
                      step="0.01"
                      value={form.commission_percentage}
                      onChange={(e) => {
                        setForm({ ...form, commission_percentage: e.target.value });
                        if (errors.commission_percentage) setErrors({ ...errors, commission_percentage: "" });
                      }}
                      placeholder="15"
                      aria-invalid={!!errors.commission_percentage}
                      disabled={isCancelled}
                    />
                    {errors.commission_percentage && (
                      <p className="text-xs text-rose-600 mt-1">{errors.commission_percentage}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="salary_min">Salary min ($)</Label>
                      <Input
                        id="salary_min"
                        type="number"
                        value={form.salary_min}
                        onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                        placeholder="80000"
                        disabled={isCancelled}
                      />
                    </div>
                    <div>
                      <Label htmlFor="salary_max">Salary max ($)</Label>
                      <Input
                        id="salary_max"
                        type="number"
                        value={form.salary_max}
                        onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                        placeholder="120000"
                        disabled={isCancelled}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">
                    Placement fee = {form.commission_percentage || "0"}% × salary_max (or salary_min if no max).
                    Recruiters see: 70% of placement fee. Platform keeps 30%.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location + Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Location &amp; status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Chicago"
                    disabled={isCancelled}
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => setForm({ ...form, state: v })}
                    disabled={isCancelled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {US_STATES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label} ({s.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_remote"
                  checked={form.is_remote}
                  onCheckedChange={(v) => setForm({ ...form, is_remote: v === true })}
                  disabled={isCancelled}
                />
                <Label htmlFor="is_remote" className="text-sm cursor-pointer">
                  Remote (work from anywhere)
                </Label>
              </div>

              <div>
                <Label htmlFor="salary_display">Salary display (shown to candidates)</Label>
                <Input
                  id="salary_display"
                  value={form.salary_display}
                  onChange={(e) => setForm({ ...form, salary_display: e.target.value })}
                  placeholder="$200k / year, $90/hr, Competitive"
                  disabled={isCancelled}
                />
                <p className="text-xs text-text-muted mt-1">
                  Free-form text — candidates see this on the job board. Example: &quot;$200k&quot;, &quot;$90/hr&quot;, &quot;Competitive&quot;.
                </p>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                  disabled={isCancelled}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open (accepting submissions)</SelectItem>
                    <SelectItem value="paused">Paused (hidden from job board)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-border">
                <Checkbox
                  id="is_public"
                  checked={form.is_public}
                  onCheckedChange={(v) => setForm({ ...form, is_public: v === true })}
                  disabled={isCancelled}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="is_public" className="text-sm cursor-pointer">
                    Public — candidates can apply directly
                  </Label>
                  <p className="text-xs text-text-muted mt-0.5">
                    If unchecked, only recruiters can submit candidates (no self-apply).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          {!isCancelled && (
            <Card className="border-rose-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="size-4" /> Danger zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-text-secondary mb-3">
                  Cancelling a job removes it from the job board immediately. Existing submissions
                  are preserved and you can still review them. This cannot be undone.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={isSaving || isCancellingJob}
                  className="text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" /> Cancel this job
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Job confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this job posting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove the job from the public job board and stop accepting
              new submissions. Existing submissions ({stats?.submissions_count ?? 0}) are preserved
              and you can still review them. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancellingJob}>Keep job open</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelJob}
              disabled={isCancellingJob}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isCancellingJob ? (
                <><Loader2 className="size-4 animate-spin" /> Cancelling…</>
              ) : (
                <>Yes, cancel this job</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
