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
  Mail,
  Phone,
  Building2,
  Users,
  Clock,
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "@/lib/icons";
import { toast } from "sonner";

interface RefItem {
  id: number;
  managerEmail: string;
  managerName: string;
  facilityName: string;
  employmentStatus: string;
  status: string;
  requestedAt: string;
  responseCount: number;
  hasResponses: boolean;
  responses: Array<{
    id: number;
    questionText: string;
    responseType: string;
    answerText: string;
    overallComment: string | null;
    digitalSignature: string | null;
    signatureDate: string | null;
    submittedAt: string | null;
  }>;
  deletionRequests: Array<{ id: number; status: string }>;
}

interface CandidateItem {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  totalReferences: number;
  completedReferences: number;
  pendingReferences: number;
  managers: string[];
  lastActivity: string | null;
  references: RefItem[];
}

interface CandidatesData {
  candidates: CandidateItem[];
  stats: {
    totalCandidates: number;
    avgRefsPerCandidate: number;
    completionRate: number;
    pendingOver7Days: number;
  };
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

function getRefStatusBadge(status: string) {
  switch (status) {
    case "pending_request":
      return <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Pending</Badge>;
    case "sent":
      return <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Sent</Badge>;
    case "opened":
      return <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px]">Opened</Badge>;
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Completed</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  }
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

function getRatingBadge(rating: number) {
  switch (rating) {
    case 1:
      return <span className="inline-flex items-center justify-center size-6 rounded bg-badge-red-bg text-status-red font-bold text-[10px]">1</span>;
    case 2:
      return <span className="inline-flex items-center justify-center size-6 rounded bg-badge-yellow-bg text-status-amber font-bold text-[10px]">2</span>;
    case 3:
      return <span className="inline-flex items-center justify-center size-6 rounded bg-badge-blue-bg text-status-blue font-bold text-[10px]">3</span>;
    case 4:
      return <span className="inline-flex items-center justify-center size-6 rounded bg-primary text-white font-bold text-[10px]">4</span>;
    default:
      return <span className="text-xs">{rating}</span>;
  }
}

export default function RefCandidatesPage() {
  const [data, setData] = useState<CandidatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [completionFilter, setCompletionFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [sendingReminder, setSendingReminder] = useState<number | null>(null);

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
      if (completionFilter !== "all") params.set("completion", completionFilter);
      if (employmentFilter !== "all") params.set("employment_status", employmentFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/superadmin/references/candidates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load candidates");
    } finally {
      setIsLoading(false);
    }
  }, [search, completionFilter, employmentFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendReminder = async (candidateId: number) => {
    setSendingReminder(candidateId);
    try {
      // Simulate sending reminder - in a real app this would call an API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Reminder sent successfully");
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ref Candidates" />
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
        title="Ref Candidates"
        description="All candidates with reference requests. View, manage, and send reminders."
      />

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.totalCandidates}</p>
                  <p className="text-xs text-muted-foreground">Total Candidates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.avgRefsPerCandidate}</p>
                  <p className="text-xs text-muted-foreground">Avg Refs/Candidate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.pendingOver7Days}</p>
                  <p className="text-xs text-muted-foreground">Pending &gt;7 Days</p>
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
                placeholder="Search candidate name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={completionFilter} onValueChange={(v) => { setCompletionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Completion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="complete">Fully Complete</SelectItem>
                <SelectItem value="partial">Partially Complete</SelectItem>
                <SelectItem value="none">No Completions</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employmentFilter} onValueChange={(v) => { setEmploymentFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Employment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="current">Currently Working</SelectItem>
                <SelectItem value="ending_contract">Ending Contract</SelectItem>
                <SelectItem value="past">Past Employment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {!data?.candidates || data.candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No candidates with references found</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead>Managers</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.candidates.map((candidate) => (
                    <Fragment key={candidate.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(candidate.id)}
                      >
                        <TableCell>
                          {expandedRows.has(candidate.id) ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{candidate.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{candidate.email}</TableCell>
                        <TableCell className="text-center text-sm font-semibold">{candidate.totalReferences}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">
                            {candidate.completedReferences}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={candidate.pendingReferences > 0 ? "bg-amber-100 text-amber-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                            {candidate.pendingReferences}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                          {candidate.managers.slice(0, 2).join(", ")}
                          {candidate.managers.length > 2 && ` +${candidate.managers.length - 2}`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {candidate.lastActivity ? new Date(candidate.lastActivity).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="size-7" aria-label="View candidate details" onClick={() => { setSelectedCandidate(candidate); setDetailOpen(true); }}>
                              <Eye className="size-3.5" />
                            </Button>
                            {candidate.pendingReferences > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                aria-label="Send reminder to references"
                                disabled={sendingReminder === candidate.id}
                                onClick={() => handleSendReminder(candidate.id)}
                              >
                                {sendingReminder === candidate.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Send className="size-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(candidate.id) && (
                        <TableRow key={`${candidate.id}-refs`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                References for {candidate.name}
                              </p>
                              {candidate.references.map((ref) => (
                                <div key={ref.id} className="flex items-center gap-3 p-2 rounded-lg bg-background">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{ref.managerName}</span>
                                      {getRefStatusBadge(ref.status)}
                                      {getEmploymentBadge(ref.employmentStatus)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Building2 className="size-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">{ref.facilityName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        Requested: {new Date(ref.requestedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    {ref.responses.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {ref.responses
                                          .filter((r) => r.responseType === "rating_1_4" && r.answerText)
                                          .slice(0, 5)
                                          .map((resp) => (
                                            <div key={resp.id} className="flex items-center gap-1">
                                              <span className="text-[10px] text-muted-foreground truncate max-w-24">{resp.questionText.slice(0, 30)}...</span>
                                              {getRatingBadge(parseInt(resp.answerText))}
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                    {ref.deletionRequests.length > 0 && (
                                      <div className="mt-1 flex items-center gap-1">
                                        <Trash2 className="size-3 text-red-500" />
                                        <span className="text-xs text-red-600">
                                          {ref.deletionRequests.length} deletion request(s)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
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
              <Users className="size-5" />
              {selectedCandidate?.name} — All References
            </DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{selectedCandidate.completedReferences}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-amber-700">{selectedCandidate.pendingReferences}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{selectedCandidate.totalReferences}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              {selectedCandidate.references.map((ref) => (
                <Card key={ref.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ref.managerName}</span>
                          {getRefStatusBadge(ref.status)}
                          {getEmploymentBadge(ref.employmentStatus)}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Building2 className="size-3" /> {ref.facilityName}
                          <span>•</span>
                          <Mail className="size-3" /> {ref.managerEmail}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ref.requestedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {ref.responses.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground">Responses</p>
                        {ref.responses.map((resp) => (
                          <div key={resp.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                            <span className="text-xs flex-1 truncate">{resp.questionText}</span>
                            {resp.responseType === "rating_1_4" && resp.answerText
                              ? getRatingBadge(parseInt(resp.answerText))
                              : <span className="text-xs">{resp.answerText}</span>}
                          </div>
                        ))}
                        {ref.responses[0]?.overallComment && (
                          <div className="p-2 rounded bg-muted/50 mt-1">
                            <p className="text-xs font-semibold text-muted-foreground">Comment</p>
                            <p className="text-xs">{ref.responses[0].overallComment}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {ref.status !== "completed" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleSendReminder(selectedCandidate.id)}>
                          <Send className="size-3" /> Send Reminder
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
