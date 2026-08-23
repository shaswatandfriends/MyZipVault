"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Users, Send, TrendingUp, Eye, CreditCard,
  CheckCircle2, Clock, ArrowRight, Plus, Sparkles, FileText,
  UserCheck, DollarSign, Bell, ChevronRight, Briefcase as BriefcaseIcon,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";

// ─── Types ─────────────────────────────────────────────────────────
interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalSubmissions: number;
  placedCount: number;
  totalSpend: number;
  pendingReview: number;
  interviewsScheduled: number;
  offersExtended: number;
  totalCredits: number;
}

interface JobRow {
  id: number;
  title: string;
  status: string;
  profession: string | null;
  specialty: string | null;
  city: string | null;
  state: string | null;
  views: number;
  applications: number;
  submissions: number;
  commission_amount: number | null;
  commission_type: string | null;
  created_at: string;
  open_date: string | null;
}

interface RecentSubmission {
  id: number;
  submitted_at: string;
  status: string;
  candidate: {
    id: number;
    name: string;
    specialty: string | null;
    profession: string | null;
  };
  job: { id: number; title: string };
  recruiter: { initials: string; recruiter_id: number } | null;
}

interface Activity {
  type: "job_posted" | "submission_received" | "placement_made";
  timestamp: string;
  data: Record<string, unknown>;
}

interface DashboardData {
  stats: DashboardStats;
  submissionsByStatus: Record<string, number>;
  jobs: JobRow[];
  recentSubmissions: RecentSubmission[];
  recentActivity: Activity[];
  hasJobs: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusColor(status: string): string {
  switch (status) {
    case "submitted": return "bg-slate-100 text-slate-700 border-slate-200";
    case "reviewing": return "bg-blue-50 text-blue-700 border-blue-200";
    case "interview": return "bg-amber-50 text-amber-700 border-amber-200";
    case "offer": return "bg-violet-50 text-violet-700 border-violet-200";
    case "placed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected": return "bg-rose-50 text-rose-700 border-rose-200";
    case "withdrawn": return "bg-slate-50 text-slate-500 border-slate-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function activityIcon(type: Activity["type"]) {
  switch (type) {
    case "job_posted": return BriefcaseIcon;
    case "submission_received": return Send;
    case "placement_made": return CheckCircle2;
    default: return Bell;
  }
}

function activityCopy(a: Activity): string {
  const d = a.data;
  if (a.type === "job_posted") {
    return `Posted job "${d.job_title}"`;
  }
  if (a.type === "placement_made") {
    return `Placement made: ${d.candidate_name} for "${d.job_title}"`;
  }
  return `${d.candidate_name} submitted by ${d.recruiter_initials} for "${d.job_title}"`;
}

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  accent = "primary",
}: {
  icon: typeof Briefcase;
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  accent?: "primary" | "terra" | "amber" | "emerald" | "violet";
}) {
  const accentBg: Record<string, string> = {
    primary: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
    terra: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
    amber: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
    emerald: "linear-gradient(180deg, #34D399 0%, #059669 100%)",
    violet: "linear-gradient(180deg, #A78BFA 0%, #7C3AED 100%)",
  };
  const content = (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background: accentBg[accent],
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(10,102,194,0.18)",
              color: "#fff",
            }}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }
  return content;
}

// ─── Main Component ────────────────────────────────────────────────
export default function EmployerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/employer/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = (await res.json()) as DashboardData;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Track your jobs, submissions, and placements in one place."
        actions={
          <Link href="/employer/jobs/new">
            <Button>
              <Plus className="size-4" />
              Post a Job
            </Button>
          </Link>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">
            <strong>Couldn&apos;t load dashboard:</strong> {error}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[110px] rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[400px] rounded-xl md:col-span-2" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </>
      )}

      {/* Loaded state */}
      {!loading && data && (
        <>
          {/* ─── Stats Row ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Briefcase}
              label="Active Jobs"
              value={data.stats.activeJobs}
              hint={`${data.stats.totalJobs} total`}
              href="/employer/jobs"
              accent="primary"
            />
            <StatCard
              icon={Send}
              label="Submissions"
              value={data.stats.totalSubmissions}
              hint={`${data.stats.pendingReview} pending review`}
              href="/employer/submissions"
              accent="primary"
            />
            <StatCard
              icon={UserCheck}
              label="Placed"
              value={data.stats.placedCount}
              hint={`${data.stats.interviewsScheduled} in interview`}
              accent="emerald"
            />
            <StatCard
              icon={DollarSign}
              label="Total Spend"
              value={formatCurrency(data.stats.totalSpend)}
              hint={`${data.stats.offersExtended} offers extended`}
              accent="violet"
            />
          </div>

          {/* ─── Empty State (no jobs) ─── */}
          {!data.hasJobs && (
            <Card>
              <CardContent className="p-10 text-center">
                <div
                  className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl"
                  style={{
                    background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
                    boxShadow: "0 8px 20px rgba(10,102,194,0.25)",
                    color: "#fff",
                  }}
                >
                  <Briefcase className="size-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Welcome to MyZipVault</h2>
                <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
                  Post your first job to start receiving vetted candidate submissions from our recruiter network.
                  Set your commission budget — the platform handles the split.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/employer/jobs/new">
                    <Button size="lg">
                      <Plus className="size-4" />
                      Post Your First Job
                    </Button>
                  </Link>
                  <Link href="/employer/candidates/search">
                    <Button variant="outline" size="lg">
                      <Users className="size-4" />
                      Browse Candidates
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Two-column: Active Jobs + Recent Activity ─── */}
          {data.hasJobs && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left: Active jobs + recent submissions */}
              <div className="md:col-span-2 space-y-6">
                {/* Active Jobs */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground">Your Active Jobs</h2>
                      <Link href="/employer/jobs" className="text-sm text-primary hover:underline flex items-center gap-1">
                        View all <ChevronRight className="size-3" />
                      </Link>
                    </div>
                    {data.jobs.length === 0 ? (
                      <p className="text-sm text-text-muted py-4 text-center">
                        No active jobs. All your jobs are either filled or cancelled.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {data.jobs.map((job) => (
                          <Link
                            key={job.id}
                            href={`/employer/jobs/${job.id}`}
                            className="block rounded-lg border border-border p-4 hover:border-primary/40 hover:bg-surface transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">{job.title}</p>
                                <p className="text-xs text-text-muted mt-0.5">
                                  {[
                                    job.profession,
                                    job.specialty,
                                    [job.city, job.state].filter(Boolean).join(", "),
                                  ].filter(Boolean).join(" · ") || "—"}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                                  <span className="flex items-center gap-1">
                                    <Eye className="size-3" /> {job.views} views
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="size-3" /> {job.applications} apps
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Send className="size-3" /> {job.submissions} submissions
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {job.commission_amount && (
                                  <p className="text-sm font-bold text-foreground">
                                    {formatCurrency(job.commission_amount)}
                                  </p>
                                )}
                                <Badge variant="outline" className={`mt-1 ${job.status === "open" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}`}>
                                  {job.status}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Submissions */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground">Recent Submissions</h2>
                      <Link href="/employer/submissions" className="text-sm text-primary hover:underline flex items-center gap-1">
                        View all <ChevronRight className="size-3" />
                      </Link>
                    </div>
                    {data.recentSubmissions.length === 0 ? (
                      <div className="py-8 text-center">
                        <Send className="size-10 text-text-muted mx-auto mb-2" />
                        <p className="text-sm text-text-muted">No submissions yet</p>
                        <p className="text-xs text-text-muted mt-1">
                          Submissions will appear here as recruiters send candidates to your jobs.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.recentSubmissions.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-surface/50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{s.candidate.name}</p>
                              <p className="text-xs text-text-muted mt-0.5 truncate">
                                {s.candidate.specialty ?? s.candidate.profession ?? "Healthcare professional"} · {s.job.title}
                              </p>
                              <p className="text-xs text-text-muted mt-0.5">
                                {s.recruiter ? `Submitted by ${s.recruiter.initials}` : "Self-apply"} · {formatRelativeTime(s.submitted_at)}
                              </p>
                            </div>
                            <Badge variant="outline" className={`flex-shrink-0 ${statusColor(s.status)}`}>
                              {s.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Activity feed + credits + quick actions */}
              <div className="space-y-6">
                {/* Credits card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="flex size-9 items-center justify-center rounded-full"
                        style={{
                          background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
                          color: "#fff",
                        }}
                      >
                        <CreditCard className="size-4" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Credits Balance</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{data.stats.totalCredits.toLocaleString()}</p>
                    <p className="text-xs text-text-muted mt-1">
                      Use credits to reveal candidate contact info for direct sourcing.
                    </p>
                    <Link href="/employer/candidates/search">
                      <Button variant="outline" size="sm" className="w-full mt-4">
                        <Users className="size-4" />
                        Browse Candidates
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
                    {data.recentActivity.length === 0 ? (
                      <p className="text-sm text-text-muted">No activity yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.recentActivity.map((a, i) => {
                          const Icon = activityIcon(a.type);
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <div className="flex size-7 items-center justify-center rounded-full bg-surface flex-shrink-0 mt-0.5">
                                <Icon className="size-3.5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground leading-snug">{activityCopy(a)}</p>
                                <p className="text-xs text-text-muted mt-0.5">{formatRelativeTime(a.timestamp)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
                    <div className="space-y-2">
                      <Link href="/employer/jobs/new" className="block">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Plus className="size-4" /> Post a new job
                        </Button>
                      </Link>
                      <Link href="/employer/candidates/search" className="block">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Users className="size-4" /> Find a candidate
                        </Button>
                      </Link>
                      <Link href="/employer/submissions" className="block">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Send className="size-4" /> Review submissions
                        </Button>
                      </Link>
                      <Link href="/marketplace-flow" className="block">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-text-muted">
                          <Sparkles className="size-4" /> How marketplace works
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
