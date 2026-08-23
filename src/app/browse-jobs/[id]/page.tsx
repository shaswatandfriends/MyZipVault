"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ArrowRight, Briefcase, MapPin, DollarSign, Building2,
  CheckCircle2, Star, Eye, Users, Calendar, Sparkles, Lock,
  AlertCircle, Loader2,
} from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────
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
  views_count: number;
  applications_count: number;
  organization_name: string | null;
  organization_website: string | null;
  is_closed: boolean;
  has_applied: boolean;
  application_status: string | null;
  application_id: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────
function getEmploymentBadge(type: string | null) {
  if (!type) return null;
  const labels: Record<string, { label: string; className: string }> = {
    permanent: { label: "Permanent", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    travel: { label: "Travel", className: "bg-blue-50 text-blue-700 border-blue-200" },
    contract: { label: "Contract", className: "bg-violet-50 text-violet-700 border-violet-200" },
    per_diem: { label: "Per Diem", className: "bg-amber-50 text-amber-700 border-amber-200" },
    locum: { label: "Locum", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  };
  const config = labels[type];
  if (!config) return null;
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function formatRelative(s: string): string {
  const diffMs = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ─────────────────────────────────────────────────
export default function PublicJobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIsCandidate, setViewerIsCandidate] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/public/jobs/${params.id}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Failed (${res.status})` }));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      setJob(data.job);
      setViewerIsCandidate(data.viewer_is_candidate === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Apply to this job (candidate only — calls /api/candidate/jobs/[id]/apply)
  const handleApply = async () => {
    if (!job) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/candidate/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      // Use sonner's toast (imported at top of file)
      import("sonner").then(({ toast }) => {
        toast.success("Application submitted", {
          description: `Your application for "${job.title}" has been received.`,
        });
      });
      setApplySuccess(true);
      // Refetch the job to update has_applied status
      await load();
    } catch (e) {
      import("sonner").then(({ toast }) => {
        toast.error("Failed to apply", {
          description: e instanceof Error ? e.message : "",
        });
      });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">M</div>
              <span className="font-semibold text-lg text-foreground">MyZipVault</span>
            </Link>
            <Link href="/signup" className="text-sm font-semibold text-primary">Sign up free →</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl px-6 py-10">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-9 w-3/4 mb-3" />
          <Skeleton className="h-5 w-1/2 mb-8" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </main>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">M</div>
              <span className="font-semibold text-lg text-foreground">MyZipVault</span>
            </Link>
            <Link href="/signup" className="text-sm font-semibold text-primary">Sign up free →</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-6 py-16">
          <Link href="/browse-jobs" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-6">
            <ArrowLeft className="size-4" /> Back to all jobs
          </Link>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="size-10 text-rose-500 mx-auto mb-3" />
              <p className="font-semibold text-foreground">Job not found</p>
              <p className="text-sm text-text-muted mt-1">{error ?? "This job may have been removed or is no longer public."}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/browse-jobs">
                  <Button variant="outline">Browse all jobs</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign up to apply</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">M</div>
            <span className="font-semibold text-lg text-foreground">MyZipVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
            >
              Sign up free <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-10">
        {/* Back link */}
        <Link href="/browse-jobs" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Back to all jobs
        </Link>

        {/* ─── Title + meta ─── */}
        <div className="flex items-start gap-2 flex-wrap mb-3">
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            {job.title}
          </h1>
          {getEmploymentBadge(job.employment_type)}
          {job.is_remote && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Remote</Badge>
          )}
          {job.is_closed && (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
              Closed — applications paused
            </Badge>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-6">
          {job.organization_name && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-4 text-primary" />
              {job.organization_name}
            </span>
          )}
          {(job.city || job.state) && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" />
              {[job.city, job.state].filter(Boolean).join(", ")}
            </span>
          )}
          {job.salary_display && (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <DollarSign className="size-4" />
              {job.salary_display}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4 text-text-muted" />
            Posted {formatRelative(job.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="size-4 text-text-muted" />
            {job.views_count} views
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-text-muted" />
            {job.applications_count} applications
          </span>
        </div>

        {/* ─── Layout: 2 columns on desktop ─── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Job content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {job.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-3">Job description</h2>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {job.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-3">Requirements</h2>
                  <ul className="space-y-2">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="size-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-text-secondary leading-relaxed">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Nice to have */}
            {job.nice_to_have && job.nice_to_have.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-3">Nice to have</h2>
                  <ul className="space-y-2">
                    {job.nice_to_have.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Star className="size-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-text-secondary leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Job details grid */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Job details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {job.profession && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1">Profession</p>
                      <p className="text-sm text-foreground">{job.profession}</p>
                    </div>
                  )}
                  {job.specialty && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1">Specialty</p>
                      <p className="text-sm text-foreground">{job.specialty}</p>
                    </div>
                  )}
                  {job.job_title && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1">Target job title</p>
                      <p className="text-sm text-foreground">{job.job_title}</p>
                    </div>
                  )}
                  {job.employment_type && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1">Employment type</p>
                      <p className="text-sm text-foreground capitalize">{job.employment_type.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {job.open_date && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1">Open date</p>
                      <p className="text-sm text-foreground">{formatDate(job.open_date)}</p>
                    </div>
                  )}
                  {job.close_date && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1">Close date</p>
                      <p className="text-sm text-foreground">{formatDate(job.close_date)}</p>
                    </div>
                  )}
                  {job.organization_website && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1">Company website</p>
                      <a
                        href={job.organization_website.startsWith("http") ? job.organization_website : `https://${job.organization_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {job.organization_website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Apply CTA (sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <Card className="border-2 border-primary">
                <CardContent className="p-6">
                  {/* ─── Candidate-viewer states ─── */}
                  {viewerIsCandidate && (
                    <>
                      {job.has_applied ? (
                        // Already applied — show status
                        <>
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-emerald-600" />
                            Application submitted
                          </h3>
                          <p className="text-sm text-text-secondary mt-2 mb-4">
                            You&apos;ve applied to this job. Status:{" "}
                            <span className="font-semibold text-foreground capitalize">
                              {job.application_status ?? "submitted"}
                            </span>
                          </p>
                          <Link href="/dashboard">
                            <Button variant="outline" size="lg" className="w-full">
                              Back to dashboard
                            </Button>
                          </Link>
                          <p className="text-xs text-text-muted mt-3 text-center">
                            You&apos;ll be notified when the employer responds.
                          </p>
                        </>
                      ) : job.is_closed ? (
                        // Closed — can't apply
                        <>
                          <h3 className="text-lg font-semibold text-foreground">Applications closed</h3>
                          <p className="text-sm text-text-secondary mt-2">
                            This job is no longer accepting applications.
                          </p>
                          <Link href="/browse-jobs" className="block mt-4">
                            <Button variant="outline" size="sm" className="w-full">
                              Browse other jobs
                            </Button>
                          </Link>
                        </>
                      ) : (
                        // Can apply — show Apply button
                        <>
                          <h3 className="text-lg font-semibold text-foreground">Interested in this role?</h3>
                          <p className="text-sm text-text-secondary mt-1 mb-4">
                            Apply directly — no recruiter needed. 100% free.
                          </p>
                          <Button
                            size="lg"
                            className="w-full"
                            onClick={handleApply}
                            disabled={applying}
                          >
                            {applying ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Submitting…
                              </>
                            ) : applySuccess ? (
                              <>
                                <CheckCircle2 className="size-4" />
                                Applied!
                              </>
                            ) : (
                              <>
                                <Briefcase className="size-4" />
                                Apply now
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-text-muted mt-3 text-center">
                            Your profile will be shared with the employer.
                          </p>
                        </>
                      )}
                    </>
                  )}

                  {/* ─── Non-candidate / anonymous viewer ─── */}
                  {!viewerIsCandidate && (
                    <>
                      <h3 className="text-lg font-semibold text-foreground">Interested in this role?</h3>
                      <p className="text-sm text-text-secondary mt-1 mb-4">
                        Sign up as a candidate to apply directly — no recruiter needed.
                      </p>
                      <Link href="/signup">
                        <Button size="lg" className="w-full" disabled={job.is_closed}>
                          <Briefcase className="size-4" />
                          {job.is_closed ? "Applications closed" : "Sign up to apply"}
                        </Button>
                      </Link>
                      <Link href="/login">
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          I already have an account
                        </Button>
                      </Link>
                    </>
                  )}

                  <div className="mt-5 pt-5 border-t border-border space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">Free for candidates</p>
                    <p className="text-xs text-text-secondary flex items-start gap-2">
                      <CheckCircle2 className="size-3 text-primary flex-shrink-0 mt-0.5" />
                      Apply directly to employers — no recruiter cut
                    </p>
                    <p className="text-xs text-text-secondary flex items-start gap-2">
                      <CheckCircle2 className="size-3 text-primary flex-shrink-0 mt-0.5" />
                      Store credentials once, reuse for every application
                    </p>
                    <p className="text-xs text-text-secondary flex items-start gap-2">
                      <Lock className="size-3 text-primary flex-shrink-0 mt-0.5" />
                      HIPAA-aligned, you control your data
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Recruiters-only callout */}
              <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-xs text-text-muted">
                <p className="font-semibold text-foreground mb-1">Recruiter?</p>
                <p>
                  You can submit candidates to this job from your recruiter dashboard.{" "}
                  <Link href="/agency-login" className="font-semibold text-primary hover:underline">
                    Sign in →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-auto">
        <div className="border-t border-border bg-white py-6 px-6">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">&copy; 2026 MyZipVault. All rights reserved.</p>
            <nav className="flex items-center gap-4 text-sm text-text-secondary">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="/browse-jobs" className="hover:text-foreground transition-colors">Jobs</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
