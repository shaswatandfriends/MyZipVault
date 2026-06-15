"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Download,
  FileSignature,
  Star,
  Building2,
  Users,
  BarChart3,
  CheckCircle2,
} from "@/lib/icons";
import { toast } from "sonner";

interface ResponseItem {
  id: number;
  candidateName: string;
  candidateEmail: string;
  managerName: string;
  managerEmail: string;
  facility: string;
  employmentStatus: string;
  submittedDate: string | null;
  avgRating: number | null;
  responses: Array<{
    id: number;
    questionId: number;
    questionText: string;
    responseType: string;
    answerText: string;
    overallComment: string | null;
    digitalSignature: string | null;
    signatureDate: string | null;
    submittedAt: string | null;
  }>;
}

interface ResponsesData {
  responses: ResponseItem[];
  stats: {
    totalResponses: number;
    avgRating: number;
    byEmploymentStatus: Record<string, number>;
  };
  facilities: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const empStatusLabel: Record<string, string> = {
  current: "Currently Working",
  ending_contract: "Ending Contract",
  past: "Past Employment",
};

function getRatingBadge(rating: number) {
  switch (rating) {
    case 1:
      return <span className="inline-flex items-center justify-center size-7 rounded-md bg-badge-red-bg text-status-red font-bold text-xs">1</span>;
    case 2:
      return <span className="inline-flex items-center justify-center size-7 rounded-md bg-badge-yellow-bg text-status-amber font-bold text-xs">2</span>;
    case 3:
      return <span className="inline-flex items-center justify-center size-7 rounded-md bg-badge-blue-bg text-status-blue font-bold text-xs">3</span>;
    case 4:
      return <span className="inline-flex items-center justify-center size-7 rounded-md bg-primary text-white font-bold text-xs">4</span>;
    default:
      return <span className="text-sm text-muted-foreground">{rating}</span>;
  }
}

function getAvgRatingDisplay(avg: number | null) {
  if (avg === null) return <span className="text-muted-foreground text-sm">—</span>;
  const rounded = Math.round(avg);
  return (
    <div className="flex items-center gap-1.5">
      {getRatingBadge(rounded)}
      <span className="text-sm font-medium">{avg.toFixed(1)}</span>
    </div>
  );
}

function getEmploymentBadge(status: string) {
  const cls =
    status === "current"
      ? "bg-emerald-100 text-emerald-800 border-0"
      : status === "ending_contract"
        ? "bg-amber-100 text-amber-800 border-0"
        : "bg-gray-100 text-gray-800 border-0";
  return <Badge className={cls}>{empStatusLabel[status] || status}</Badge>;
}

export default function RefResponsesPage() {
  const [data, setData] = useState<ResponsesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState<ResponseItem | null>(null);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (employmentFilter !== "all") params.set("employment_status", employmentFilter);
      if (facilityFilter !== "all") params.set("facility", facilityFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/superadmin/references/responses?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load reference responses");
    } finally {
      setIsLoading(false);
    }
  }, [search, employmentFilter, facilityFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDetail = (ref: ResponseItem) => {
    setSelectedRef(ref);
    setDetailOpen(true);
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ref Responses" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ref Responses"
        description="View all submitted reference forms with detailed question answers and ratings."
        actions={
          <Button variant="outline" size="sm" onClick={() => window.open("/api/admin/reference-questions/export-data", "_blank")}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.totalResponses}</p>
                  <p className="text-xs text-muted-foreground">Total Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Star className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.avgRating}</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Building2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.byEmploymentStatus.current}</p>
                  <p className="text-xs text-muted-foreground">Current</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
                  <Users className="size-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(data.stats.byEmploymentStatus.ending_contract || 0) + (data.stats.byEmploymentStatus.past || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Ending/Past</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidate or manager name..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={employmentFilter} onValueChange={(v) => { setEmploymentFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Employment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="current">Currently Working</SelectItem>
                <SelectItem value="ending_contract">Ending Contract</SelectItem>
                <SelectItem value="past">Past Employment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={facilityFilter} onValueChange={(v) => { setFacilityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {data?.facilities.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {!data?.responses || data.responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No submitted reference responses found</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>ID</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.responses.map((ref) => (
                    <Fragment key={ref.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(ref.id)}
                      >
                        <TableCell>
                          {expandedRows.has(ref.id) ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-mono">#{ref.id}</TableCell>
                        <TableCell className="text-sm font-medium">{ref.candidateName}</TableCell>
                        <TableCell className="text-sm">{ref.managerName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ref.facility}</TableCell>
                        <TableCell>{getEmploymentBadge(ref.employmentStatus)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ref.submittedDate ? new Date(ref.submittedDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>{getAvgRatingDisplay(ref.avgRating)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); openDetail(ref); }}>
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(ref.id) && (
                        <TableRow key={`${ref.id}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="space-y-2">
                              {ref.responses.map((resp) => (
                                <div key={resp.id} className="flex items-start gap-3 p-2 rounded-lg bg-background">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium">{resp.questionText}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {resp.responseType === "rating_1_4" && resp.answerText ? (
                                        getRatingBadge(parseInt(resp.answerText))
                                      ) : resp.responseType === "yes_no" ? (
                                        <Badge className={resp.answerText === "yes" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                                          {resp.answerText}
                                        </Badge>
                                      ) : (
                                        <span className="text-sm">{resp.answerText || "—"}</span>
                                      )}
                                      <span className="text-xs text-muted-foreground">({resp.responseType})</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {ref.responses.length === 0 && (
                                <p className="text-sm text-muted-foreground">No responses recorded</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="size-5" />
              Reference Response Detail #{selectedRef?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedRef && (
            <div className="space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Candidate</p>
                  <p className="text-sm font-medium">{selectedRef.candidateName}</p>
                  <p className="text-xs text-muted-foreground">{selectedRef.candidateEmail}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Manager</p>
                  <p className="text-sm font-medium">{selectedRef.managerName}</p>
                  <p className="text-xs text-muted-foreground">{selectedRef.managerEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getEmploymentBadge(selectedRef.employmentStatus)}
                <span className="text-sm text-muted-foreground">{selectedRef.facility}</span>
                {selectedRef.submittedDate && (
                  <span className="text-xs text-muted-foreground">
                    Submitted: {new Date(selectedRef.submittedDate).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Questions & Answers */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Questions &amp; Answers</p>
                {selectedRef.responses.map((resp, idx) => (
                  <div key={resp.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium">
                        {idx + 1}. {resp.questionText}
                      </p>
                      <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                        {resp.responseType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {resp.responseType === "rating_1_4" && resp.answerText ? (
                        <div className="flex items-center gap-2">
                          {getRatingBadge(parseInt(resp.answerText))}
                          <span className="text-sm font-medium">{resp.answerText}/4</span>
                        </div>
                      ) : resp.responseType === "yes_no" ? (
                        <Badge className={resp.answerText === "yes" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                          {resp.answerText}
                        </Badge>
                      ) : (
                        <p className="text-sm">{resp.answerText || "—"}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Comment */}
              {selectedRef.responses[0]?.overallComment && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Overall Comment</p>
                  <p className="text-sm">{selectedRef.responses[0].overallComment}</p>
                </div>
              )}

              {/* Digital Signature */}
              {selectedRef.responses[0]?.digitalSignature && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Digital Signature</p>
                  <p className="text-sm font-medium italic">{selectedRef.responses[0].digitalSignature}</p>
                  {selectedRef.responses[0].signatureDate && (
                    <p className="text-xs text-muted-foreground">
                      Signed: {new Date(selectedRef.responses[0].signatureDate).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
