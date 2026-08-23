"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Briefcase,
  Search,
  MapPin,
  DollarSign,
  RefreshCw,
  Eye,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Building2,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ─────────────────────────────────────────────────────────────
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
  has_applied: boolean;
  created_at: string;
}

// ─── Employment type badges ─────────────────────────────────────────────
function getEmploymentBadge(type: string | null) {
  if (!type) return null;
  const labels: Record<string, { label: string; className: string }> = {
    permanent: { label: "Permanent", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    travel: { label: "Travel", className: "bg-blue-100 text-blue-700 border-blue-200" },
    contract: { label: "Contract", className: "bg-purple-100 text-purple-700 border-purple-200" },
    per_diem: { label: "Per Diem", className: "bg-amber-100 text-amber-700 border-amber-200" },
    locum: { label: "Locum", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  };
  const config = labels[type];
  if (!config) return null;
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

// ─── Main component ────────────────────────────────────────────────────
export default function CandidateJobsBrowsePage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search,
        page: String(page),
        pageSize: "25",
      });
      if (professionFilter !== "all") params.set("profession", professionFilter);
      if (remoteOnly) params.set("is_remote", "true");

      const res = await fetch(`/api/candidate/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setJobs(json.jobs);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (err) {
      toast.error("Failed to load jobs", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsLoading(false);
    }
  }, [search, professionFilter, remoteOnly, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchJobs();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, professionFilter, remoteOnly, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Browse Jobs"
        description="Find healthcare positions matched to your specialty. Apply directly — no recruiter needed."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Briefcase className="size-5 text-blue-600" />
          <div>
            <p className="text-xs text-muted-foreground">Open Jobs</p>
            <p className="text-lg font-bold">{total.toLocaleString()}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground">Applied</p>
            <p className="text-lg font-bold">{jobs.filter((j) => j.has_applied).length}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Eye className="size-5 text-purple-600" />
          <div>
            <p className="text-xs text-muted-foreground">Page</p>
            <p className="text-lg font-bold">{page} / {totalPages || 1}</p>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, specialty, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={professionFilter} onValueChange={setProfessionFilter}>
              <SelectTrigger><SelectValue placeholder="Profession" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Professions</SelectItem>
                <SelectItem value="nursing">Nursing</SelectItem>
                <SelectItem value="allied">Allied Health</SelectItem>
                <SelectItem value="physician">Physician</SelectItem>
                <SelectItem value="non-clinical">Non-Clinical</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={remoteOnly ? "default" : "outline"}
              onClick={() => setRemoteOnly(!remoteOnly)}
              className="flex items-center justify-start"
            >
              <Building2 className="size-4 mr-2" />
              {remoteOnly ? "Remote Only ✓" : "Remote OK"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or check back later — new jobs are posted regularly.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearch(""); setProfessionFilter("all"); setRemoteOnly(false); }}>
              <RefreshCw className="size-4 mr-2" /> Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base leading-tight">{job.title}</h3>
                      {job.specialty && (
                        <p className="text-sm text-muted-foreground">{job.specialty}</p>
                      )}
                    </div>
                    {job.has_applied && (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 shrink-0">
                        <CheckCircle2 className="size-3 mr-1" />
                        Applied
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {job.is_remote ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" /> Remote
                      </span>
                    ) : (
                      (job.city || job.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {[job.city, job.state].filter(Boolean).join(", ")}
                        </span>
                      )
                    )}
                    {job.salary_display && (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <DollarSign className="size-3" /> {job.salary_display}
                      </span>
                    )}
                    {getEmploymentBadge(job.employment_type)}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </p>
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      View details <ArrowRight className="size-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
