"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Briefcase,
  Search,
  MapPin,
  DollarSign,
  Users,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Building2,
  Percent,
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
  commission_type: string | null;
  commission_amount: number | null;
  commission_percentage: number | null;
  total_submissions: number;
  my_submission: { id: number; status: string; submitted_at: string } | null;
  close_date: string | null;
  created_at: string;
}

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

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search, page: String(page), pageSize: "25",
      });
      if (professionFilter !== "all") params.set("profession", professionFilter);
      const res = await fetch(`/api/recruiter/jobs?${params}`);
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
  }, [search, professionFilter, page]);

  useEffect(() => {
    const timeout = setTimeout(() => { setPage(1); fetchJobs(); }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, professionFilter, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Open Jobs"
        description="Browse open positions and submit candidates. Commission info is shown — pick the jobs worth your time."
        actions={
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Briefcase className="size-5 text-blue-600" />
          <div>
            <p className="text-xs text-muted-foreground">Open Jobs</p>
            <p className="text-lg font-bold">{total}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Users className="size-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground">My Submissions</p>
            <p className="text-lg font-bold">{jobs.filter(j => j.my_submission).length}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <DollarSign className="size-5 text-amber-600" />
          <div>
            <p className="text-xs text-muted-foreground">Total Subs</p>
            <p className="text-lg font-bold">{jobs.reduce((s, j) => s + j.total_submissions, 0)}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-purple-600" />
          <div>
            <p className="text-xs text-muted-foreground">Page</p>
            <p className="text-lg font-bold">{page} / {totalPages || 1}</p>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by title, specialty, or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
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
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : jobs.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Briefcase className="size-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">No open jobs found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or check back later.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{job.title}</h3>
                      {getEmploymentBadge(job.employment_type)}
                      {job.my_submission && (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                          <CheckCircle2 className="size-3 mr-1" />Submitted
                        </Badge>
                      )}
                    </div>
                    {job.specialty && <p className="text-sm text-muted-foreground">{job.specialty}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-sm pt-1">
                      {job.is_remote ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="size-3" /> Remote
                        </span>
                      ) : (job.city || job.state) && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3" /> {[job.city, job.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {job.salary_display && (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <DollarSign className="size-3" /> {job.salary_display}
                        </span>
                      )}
                      {job.commission_type === "flat" && job.commission_amount && (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <DollarSign className="size-3" /> Fee: ${job.commission_amount.toLocaleString()}
                        </span>
                      )}
                      {job.commission_type === "percentage" && job.commission_percentage && (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <Percent className="size-3" /> Fee: {job.commission_percentage}% of salary
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="size-3" /> {job.total_submissions} submission{job.total_submissions !== 1 ? "s" : ""}
                      </span>
                      {job.close_date && (
                        <span className="text-xs text-amber-600">
                          Closes {new Date(job.close_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/recruiter/candidates/search?jobId=${job.id}`}>
                    <Button size="sm">
                      Submit Candidate <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
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
