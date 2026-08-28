"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Send,
  Clock,
  FileText,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JobDetail {
  id: number;
  public_id: string;
  title: string;
  profession: string | null;
  specialty: string | null;
  job_title: string | null;
  employment_type: string | null;
  city: string | null;
  state: string | null;
  is_remote: boolean;
  salary_display: string | null;
  description: string | null;
  requirements: string[] | null;
  nice_to_have: string[] | null;
  open_date: string | null;
  close_date: string | null;
  created_at: string;
}

interface ExistingApplication {
  id: number;
  status: string;
  submitted_at: string;
}

function getEmploymentLabel(type: string | null) {
  if (!type) return null;
  const labels: Record<string, string> = {
    permanent: "Permanent", travel: "Travel", contract: "Contract",
    per_diem: "Per Diem", locum: "Locum Tenens",
  };
  return labels[type] ?? type;
}

export default function CandidateJobDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [myApplication, setMyApplication] = useState<ExistingApplication | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/candidate/jobs/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Job not available", { description: "This job may have been closed or removed." });
          router.push("/jobs");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setJob(data.job);
      setMyApplication(data.my_application);
    } catch (err) {
      toast.error("Failed to load job", { description: err instanceof Error ? err.message : "" });
      router.push("/jobs");
    } finally {
      setIsLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const handleApply = async () => {
    try {
      setIsApplying(true);
      const res = await fetch(`/api/candidate/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_note: coverNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Already applied — update state
          setMyApplication(data.existing_application);
          toast.info("Already applied", { description: "You've already applied to this job." });
          setApplyDialogOpen(false);
          return;
        }
        throw new Error(data.error || "Failed to apply");
      }
      toast.success("Application submitted", { description: `Applied to "${job?.title ?? "job"}"` });
      setApplyDialogOpen(false);
      setCoverNote("");
      // Refresh to show "Applied" state
      fetchJob();
    } catch (err) {
      toast.error("Failed to apply", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Job Details" description="Loading..." />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        description={job.specialty ? `${job.specialty}${job.profession ? ` · ${job.profession}` : ""}` : job.profession ?? ""}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Jobs
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job metadata cards */}
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {job.is_remote ? (
                      <><Building2 className="size-4 text-blue-600" /> Remote</>
                    ) : (
                      <><MapPin className="size-4 text-blue-600" /> {[job.city, job.state].filter(Boolean).join(", ") || "—"}</>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Salary</p>
                  <p className="text-sm font-medium flex items-center gap-1 text-emerald-700">
                    <DollarSign className="size-4" /> {job.salary_display ?? "Not disclosed"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Briefcase className="size-4 text-purple-600" /> {getEmploymentLabel(job.employment_type) ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Posted</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="size-4 text-amber-600" /> {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {job.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Job Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.requirements.map((req, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Nice to have */}
          {job.nice_to_have && job.nice_to_have.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Nice to Have</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.nice_to_have.map((nh, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <span className="text-muted-foreground">{nh}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Apply</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {myApplication ? (
                <div className="space-y-3">
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-center">
                    <CheckCircle2 className="size-8 text-emerald-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-emerald-800">Application Submitted</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      {new Date(myApplication.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1">
                      <Clock className="size-3" /> Status: <Badge variant="outline" className="capitalize">{myApplication.status.replace("_", " ")}</Badge>
                    </p>
                    <p>The employer will reach out if there's a fit. You'll be notified of any status updates.</p>
                  </div>
                </div>
              ) : job.close_date && new Date(job.close_date) < new Date() ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-center">
                  <Clock className="size-8 text-amber-600 mx-auto mb-1" />
                  <p className="text-sm font-medium text-amber-800">Application Closed</p>
                  <p className="text-xs text-amber-700 mt-1">This job is no longer accepting applications.</p>
                </div>
              ) : (
                <Button className="w-full" size="lg" onClick={() => setApplyDialogOpen(true)}>
                  <Send className="size-4 mr-2" /> Apply Now
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {job.close_date ? (
                  <>Closes {new Date(job.close_date).toLocaleDateString()}</>
                ) : (
                  <>Open until filled</>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Need help?</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Make sure your profile is up to date before applying — the employer will see your
                credentials, resume, and references.
              </p>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="size-3.5 mr-2" /> Review Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Apply dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to "{job.title}"</DialogTitle>
            <DialogDescription>
              Your application will be submitted directly to the employer. Add a brief cover note
              (optional) to introduce yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="cover_note">Cover Note (optional)</Label>
              <Textarea
                id="cover_note"
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Brief introduction, your interest in the role, and your relevant experience..."
              />
              <p className="text-xs text-muted-foreground mt-1">{coverNote.length}/2000 characters</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)} disabled={isApplying}>Cancel</Button>
            <Button onClick={handleApply} disabled={isApplying}>
              {isApplying ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="size-4 mr-2" /> Submit Application</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
