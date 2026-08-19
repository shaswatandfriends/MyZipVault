"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  RefreshCw,
  Eye,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  Loader2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  status: string;
  is_public: boolean;
  open_date: string | null;
  close_date: string | null;
  posted_by: string | null;
  organization: string | null;
  views_count: number;
  applications_count: number;
  submissions_count: number;
  created_at: string;
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

export default function JobsListPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search,
        page: String(page),
        pageSize: "50",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/superadmin/jobs?${params}`);
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
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchJobs();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Post and manage job openings. Recruiters can submit candidates to these jobs."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchJobs} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/superadmin/jobs/new">
              <Button size="sm">
                <Plus className="size-4" />
                New Job
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Briefcase className="size-5 text-blue-600" />
          <div>
            <p className="text-xs text-muted-foreground">Total Jobs</p>
            <p className="text-lg font-bold">{total}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Users className="size-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground">Total Submissions</p>
            <p className="text-lg font-bold">{jobs.reduce((sum, j) => sum + j.submissions_count, 0)}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Calendar className="size-5 text-purple-600" />
          <div>
            <p className="text-xs text-muted-foreground">Showing</p>
            <p className="text-lg font-bold">{jobs.length}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Eye className="size-5 text-amber-600" />
          <div>
            <p className="text-xs text-muted-foreground">Total Views</p>
            <p className="text-lg font-bold">{jobs.reduce((sum, j) => sum + j.views_count, 0)}</p>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, specialty, or job title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No jobs found</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first job posting.</p>
              <Link href="/superadmin/jobs/new">
                <Button size="sm" className="mt-3"><Plus className="size-4" />New Job</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Subs</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium text-sm">{j.title}</TableCell>
                      <TableCell className="text-sm">{j.specialty ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {j.city || j.state || j.is_remote ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground" />
                            {j.is_remote ? "Remote" : [j.city, j.state].filter(Boolean).join(", ")}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {j.salary_display ? (
                          <span className="flex items-center gap-1">
                            <DollarSign className="size-3 text-emerald-600" />
                            {j.salary_display}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {j.commission_type === "flat" && j.commission_amount ? `$${j.commission_amount.toLocaleString()}` :
                         j.commission_type === "percentage" && j.commission_percentage ? `${j.commission_percentage}%` :
                         "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(j.status)}</TableCell>
                      <TableCell>
                        {j.is_public ? (
                          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">Public</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">Private</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-center">{j.submissions_count}</TableCell>
                      <TableCell className="text-sm text-center">{j.views_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/superadmin/jobs/${j.id}`}>
                          <Button variant="ghost" size="sm" className="size-7" aria-label="View job details">
                            <Eye className="size-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
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
