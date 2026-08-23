"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Briefcase, Plus, Search, RefreshCw, Eye, MapPin, DollarSign,
  Users, Percent, CheckCircle2, Loader2, Send,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface JobRow {
  id: number; public_id: string; title: string; profession: string | null;
  specialty: string | null; job_title: string | null; employment_type: string | null;
  city: string | null; state: string | null; is_remote: boolean;
  salary_display: string | null; commission_type: string | null;
  commission_amount: number | null; commission_percentage: number | null;
  status: string; is_public: boolean; views_count: number;
  applications_count: number; submissions_count: number; created_at: string;
  recruiter_payout_pct: number; platform_fee_pct: number;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "open": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Open</Badge>;
    case "draft": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Draft</Badge>;
    case "paused": return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Paused</Badge>;
    case "filled": return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Filled</Badge>;
    case "cancelled": return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/employer/jobs?${params}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setJobs(json.jobs);
    } catch { toast.error("Failed to load jobs"); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchJobs(), 400);
    return () => clearTimeout(t);
  }, [fetchJobs]);

  return (
    <div className="space-y-6">
      <PageHeader title="My Jobs" description="Post and manage your job openings. Set your own commission budget."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchJobs} disabled={isLoading}><RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>
            <Link href="/employer/jobs/new"><Button size="sm"><Plus className="size-4" />Post a Job</Button></Link>
          </div>
        } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2"><Briefcase className="size-5 text-[var(--primary)]" /><div><p className="text-xs text-muted-foreground">Total Jobs</p><p className="text-lg font-bold">{jobs.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Open</p><p className="text-lg font-bold">{jobs.filter(j => j.status === "open").length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><Send className="size-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Submissions</p><p className="text-lg font-bold">{jobs.reduce((s, j) => s + j.submissions_count, 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><Eye className="size-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Views</p><p className="text-lg font-bold">{jobs.reduce((s, j) => s + j.views_count, 0)}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search by title or specialty..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      ) : jobs.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Briefcase className="size-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">No jobs posted yet</p>
          <Link href="/employer/jobs/new"><Button size="sm" className="mt-3"><Plus className="size-4 mr-2" />Post Your First Job</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{job.title}</h3>
                      {getStatusBadge(job.status)}
                      {job.is_public && <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">Public</Badge>}
                    </div>
                    {job.specialty && <p className="text-sm text-muted-foreground">{job.specialty}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {job.is_remote ? (
                        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3" /> Remote</span>
                      ) : (job.city || job.state) && (
                        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3" /> {[job.city, job.state].filter(Boolean).join(", ")}</span>
                      )}
                      {job.salary_display && <span className="flex items-center gap-1 text-emerald-700 font-medium"><DollarSign className="size-3" /> {job.salary_display}</span>}
                      {job.commission_type === "flat" && job.commission_amount && (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <DollarSign className="size-3" /> Commission: ${job.commission_amount.toLocaleString()}
                          <span className="text-muted-foreground ml-1">(Recruiter gets ${Math.round(job.commission_amount * 0.7).toLocaleString()} · Platform ${Math.round(job.commission_amount * 0.3).toLocaleString()})</span>
                        </span>
                      )}
                      {job.commission_type === "percentage" && job.commission_percentage && (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <Percent className="size-3" /> Commission: {job.commission_percentage}% of salary
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground"><Send className="size-3" /> {job.submissions_count} submission{job.submissions_count !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1 text-muted-foreground"><Eye className="size-3" /> {job.views_count} views</span>
                    </div>
                  </div>
                  <Link href={`/employer/jobs/${job.id}`}><Button size="sm" variant="outline">Edit</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
