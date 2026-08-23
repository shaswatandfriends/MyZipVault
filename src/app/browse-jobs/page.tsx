"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Briefcase, Search, MapPin, DollarSign, RefreshCw, Eye, ArrowRight,
  Building2, ChevronRight, Loader2, Users, Calendar, Sparkles,
  CheckCircle2, Star,
} from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────
interface JobRow {
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
  description_preview: string | null;
  requirements_count: number;
  nice_to_have_count: number;
  open_date: string | null;
  close_date: string | null;
  created_at: string;
  organization_name: string | null;
  has_applied: boolean;
  application_status: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface JobsResponse {
  jobs: JobRow[];
  pagination: Pagination;
  viewer_role: string | null;
  viewer_is_candidate: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────
const PROFESSIONS = [
  { value: "all", label: "All Professions" },
  { value: "Nursing", label: "Nursing" },
  { value: "Allied Health", label: "Allied Health" },
  { value: "Physician", label: "Physician" },
  { value: "Advanced Practice", label: "Advanced Practice" },
  { value: "Therapy", label: "Therapy" },
];

const EMPLOYMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "permanent", label: "Permanent" },
  { value: "travel", label: "Travel" },
  { value: "contract", label: "Contract" },
  { value: "per_diem", label: "Per Diem" },
  { value: "locum", label: "Locum" },
];

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

// ─── Main Component ─────────────────────────────────────────────────
export default function PublicJobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [viewerIsCandidate, setViewerIsCandidate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [page, setPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      });
      if (search) params.set("search", search);
      if (professionFilter !== "all") params.set("profession", professionFilter);
      if (employmentFilter !== "all") params.set("employment_type", employmentFilter);
      if (remoteOnly) params.set("is_remote", "true");

      const res = await fetch(`/api/public/jobs?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = (await res.json()) as JobsResponse;
      setJobs(data.jobs);
      setPagination(data.pagination);
      setViewerIsCandidate(data.viewer_is_candidate);
    } catch (e) {
      toast.error("Failed to load jobs", { description: e instanceof Error ? e.message : "" });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, professionFilter, employmentFilter, remoteOnly]);

  useEffect(() => {
    const t = setTimeout(() => fetchJobs(), 300);
    return () => clearTimeout(t);
  }, [fetchJobs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, professionFilter, employmentFilter, remoteOnly]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              M
            </div>
            <span
              className="font-semibold text-lg text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              MyZipVault
            </span>
            <span className="ml-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Jobs
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {viewerIsCandidate ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground"
              >
                Back to dashboard <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-text-secondary hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
                >
                  Sign up free <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
            Healthcare Job Board
          </p>
          <h1
            className="text-4xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            Find your next healthcare role.
          </h1>
          <p className="mt-3 text-base text-text-secondary max-w-2xl">
            Browse open jobs posted by hospitals and healthcare employers.
            Apply directly — no recruiter required. 100% free for healthcare professionals.
          </p>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" /> 100% free for candidates
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" /> Apply directly, no recruiter cut
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" /> HIPAA-aligned
            </span>
          </div>
        </div>
      </section>

      {/* ─── Main ─── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        {/* ─── Filter Bar ─── */}
        <div className="rounded-2xl border border-border bg-white p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
              <Input
                placeholder="Search by title, specialty, or profession…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Profession */}
            <Select value={professionFilter} onValueChange={setProfessionFilter}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Profession" />
              </SelectTrigger>
              <SelectContent>
                {PROFESSIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Employment type */}
            <Select value={employmentFilter} onValueChange={setEmploymentFilter}>
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Remote toggle */}
            <Button
              variant={remoteOnly ? "default" : "outline"}
              size="default"
              onClick={() => setRemoteOnly(!remoteOnly)}
              className="md:w-32"
            >
              <MapPin className="size-4" />
              {remoteOnly ? "Remote" : "On-site"}
            </Button>

            {(search || professionFilter !== "all" || employmentFilter !== "all" || remoteOnly) && (
              <Button
                variant="ghost"
                size="default"
                onClick={() => {
                  setSearch("");
                  setProfessionFilter("all");
                  setEmploymentFilter("all");
                  setRemoteOnly(false);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Result count */}
          <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
            <span>
              {isLoading
                ? "Loading…"
                : `${pagination.total} job${pagination.total === 1 ? "" : "s"} found`}
            </span>
            <Button variant="ghost" size="sm" onClick={fetchJobs} disabled={isLoading}>
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── Jobs List ─── */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          /* Empty state */
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="size-12 text-text-muted mx-auto mb-3" />
              <p className="font-medium text-foreground">No jobs found</p>
              <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
                {search || professionFilter !== "all" || employmentFilter !== "all" || remoteOnly
                  ? "Try adjusting your filters or search terms to see more openings."
                  : "No jobs have been posted yet. Check back soon — employers are signing up every day."}
              </p>
              {(search || professionFilter !== "all" || employmentFilter !== "all" || remoteOnly) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    setProfessionFilter("all");
                    setEmploymentFilter("all");
                    setRemoteOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/browse-jobs/${job.id}`}
                className="block rounded-2xl border border-border bg-white p-5 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  {/* Left: title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground">
                        {job.title}
                      </h3>
                      {getEmploymentBadge(job.employment_type)}
                      {job.is_remote && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Remote
                        </Badge>
                      )}
                      {job.has_applied && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="size-3" />
                          {job.application_status === "placed"
                            ? "Placed"
                            : job.application_status === "rejected"
                            ? "Rejected"
                            : "Applied"}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      {job.organization_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" />
                          {job.organization_name}
                        </span>
                      )}
                      {job.specialty && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="size-3" />
                          {job.specialty}
                        </span>
                      )}
                      {(job.city || job.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {[job.city, job.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {job.salary_display && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <DollarSign className="size-3" />
                          {job.salary_display}
                        </span>
                      )}
                    </div>
                    {job.description_preview && (
                      <p className="mt-2 text-sm text-text-secondary leading-relaxed line-clamp-2">
                        {job.description_preview}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        {job.requirements_count} requirement{job.requirements_count === 1 ? "" : "s"}
                      </span>
                      {job.nice_to_have_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="size-3" />
                          {job.nice_to_have_count} nice-to-have
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Posted {formatRelative(job.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <div className="flex-shrink-0 md:ml-3">
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                      View details
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Link>
            ))}

            {/* ─── Pagination ─── */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Sign-up CTA (only for non-candidate viewers) ─── */}
        {!isLoading && !viewerIsCandidate && (
          <div className="mt-10 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary-light/30 to-white p-8 text-center">
            <h2
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              Ready to apply?
            </h2>
            <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
              Create a free candidate account to apply for jobs, store your credentials, and get
              matched with recruiters — all in one place.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
              >
                Sign up as a candidate <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
              >
                I already have an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-text-muted">
              Are you an employer?{" "}
              <Link href="/employer-signup" className="font-semibold text-primary hover:underline">
                Post jobs here
              </Link>
            </p>
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-auto">
        <div className="border-t border-border bg-white py-6 px-6">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">&copy; 2026 MyZipVault. All rights reserved.</p>
            <nav className="flex items-center gap-4 text-sm text-text-secondary">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
