"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Database,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Upload,
  Building2,
  MapPin,
  Briefcase,
  ShieldCheck,
  User,
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

// ─── Types ─────────────────────────────────────────────────────────────
interface CandidateRow {
  id: number;
  public_id: string;
  fullName: string;
  city: string | null;
  state: string | null;
  jobTitle: string | null;
  specialty: string | null;
  profession: string | null;
  source: string;
  claimed: boolean;
  primaryEmail: string | null;
  primaryPhone: string | null;
  ownershipPhase: string | null;
  submissionCount: number;
  createdAt: string;
}

interface ListResponse {
  candidates: CandidateRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

// ─── Source badge ──────────────────────────────────────────────────────
function getSourceBadge(source: string) {
  switch (source) {
    case "platform_pool":
      return <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">Pool</Badge>;
    case "recruiter_submitted":
      return <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">Recruiter</Badge>;
    case "self_signup":
      return <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Self</Badge>;
    default:
      return <Badge variant="outline">{source}</Badge>;
  }
}

// ─── Main component ────────────────────────────────────────────────────
export default function CandidatePoolPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (professionFilter !== "all") params.set("profession", professionFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);

      const res = await fetch(`/api/superadmin/candidates/list?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load candidates";
      toast.error("Failed to load candidates", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, professionFilter, sourceFilter, page]);

  useEffect(() => {
    // Debounce search input
    if (searchDebounce) clearTimeout(searchDebounce);
    const timeout = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 400);
    setSearchDebounce(timeout);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, professionFilter, sourceFilter, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates Pool"
        description="All healthcare candidate records — imported via CSV, recruiter-submitted, or self-claimed."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/superadmin/candidates/import">
              <Button size="sm">
                <Upload className="size-4" />
                Import CSV
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Database className="size-5 text-blue-600" />
          <div>
            <p className="text-xs text-muted-foreground">Total Pool</p>
            <p className="text-lg font-bold">{data?.pagination.total.toLocaleString() ?? "—"}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Building2 className="size-5 text-purple-600" />
          <div>
            <p className="text-xs text-muted-foreground">Showing</p>
            <p className="text-lg font-bold">{data?.candidates.length ?? 0}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <User className="size-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground">Page</p>
            <p className="text-lg font-bold">{page} / {data?.pagination.totalPages ?? 1}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-amber-600" />
          <div>
            <p className="text-xs text-muted-foreground">Claimed</p>
            <p className="text-lg font-bold">{data?.candidates.filter(c => c.claimed).length ?? 0}</p>
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
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="platform_pool">Platform Pool</SelectItem>
                <SelectItem value="recruiter_submitted">Recruiter-Submitted</SelectItem>
                <SelectItem value="self_signup">Self-Signup</SelectItem>
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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.candidates.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No candidates found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try importing a CSV to get started, or adjust your filters.
              </p>
              <Link href="/superadmin/candidates/import">
                <Button size="sm" className="mt-3">
                  <Upload className="size-4" />
                  Import CSV
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Ownership</TableHead>
                    <TableHead>Subs</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.candidates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{c.fullName || "—"}</p>
                          {c.claimed && (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px] mt-0.5">
                              Claimed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.primaryEmail && <p>{c.primaryEmail}</p>}
                        {c.primaryPhone && <p>{c.primaryPhone}</p>}
                        {!c.primaryEmail && !c.primaryPhone && <span>—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.city || c.state ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground" />
                            {[c.city, c.state].filter(Boolean).join(", ")}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.jobTitle ? (
                          <span className="flex items-center gap-1">
                            <Briefcase className="size-3 text-muted-foreground" />
                            {c.jobTitle}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{c.specialty ?? "—"}</TableCell>
                      <TableCell>{getSourceBadge(c.source)}</TableCell>
                      <TableCell>
                        {c.ownershipPhase ? (
                          <Badge variant="outline" className={
                            c.ownershipPhase === "exclusive" ? "text-purple-700 border-purple-300 bg-purple-50" :
                            c.ownershipPhase === "residual" ? "text-amber-700 border-amber-300 bg-amber-50" :
                            "text-gray-700 border-gray-300 bg-gray-50"
                          }>
                            {c.ownershipPhase}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">Open</span>}
                      </TableCell>
                      <TableCell className="text-sm text-center">{c.submissionCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="size-7" aria-label="View candidate details">
                          <Eye className="size-3.5" />
                        </Button>
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
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.pagination.total)} of {data.pagination.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages || isLoading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
