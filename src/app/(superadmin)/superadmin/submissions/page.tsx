"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Send, Search, RefreshCw, DollarSign, Users, Briefcase, Clock, CheckCircle2,
  TrendingUp, Loader2,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubmissionRow {
  id: number;
  submitted_at: string;
  status: string;
  submission_type: string;
  payout_split_phase: string | null;
  placement_fee: number | null;
  recruiter_payout: number | null;
  platform_payout: number | null;
  original_owner_residual: number | null;
  placed_at: string | null;
  candidate: { id: number; fullName: string; specialty: string | null; profession: string | null; source: string };
  job: { id: number; title: string; commission_type: string | null; commission_amount: number | null; commission_percentage: number | null };
  recruiter: { id: number; name: string; email: string } | null;
  organization: string | null;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200" },
    reviewing: { label: "Reviewing", className: "bg-amber-100 text-amber-700 border-amber-200" },
    interview: { label: "Interview", className: "bg-purple-100 text-purple-700 border-purple-200" },
    offer: { label: "Offer", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    placed: { label: "Placed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
    withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-700 border-gray-200" },
  };
  const c = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function getSubmissionTypeBadge(type: string) {
  if (type === "self_apply") return <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Self-apply</Badge>;
  return <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">Recruiter</Badge>;
}

function getSplitBadge(phase: string | null) {
  if (!phase) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    exclusive: "75/25",
    residual: "68/30/2",
    open: "70/30",
    self_apply: "100% platform",
  };
  const colors: Record<string, string> = {
    exclusive: "text-purple-700 border-purple-300 bg-purple-50",
    residual: "text-amber-700 border-amber-300 bg-amber-50",
    open: "text-gray-700 border-gray-300 bg-gray-50",
    self_apply: "text-emerald-700 border-emerald-300 bg-emerald-50",
  };
  return <Badge variant="outline" className={colors[phase] ?? ""}>{map[phase] ?? phase}</Badge>;
}

export default function SubmissionsListPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRow | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search, page: String(page), pageSize: "50",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("submission_type", typeFilter);
      const res = await fetch(`/api/superadmin/submissions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setSubmissions(json.submissions);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (err) {
      toast.error("Failed to load submissions", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter, page]);

  useEffect(() => {
    const timeout = setTimeout(() => { setPage(1); fetchSubmissions(); }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, typeFilter, page]);

  const openStatusDialog = (sub: SubmissionRow) => {
    setSelectedSubmission(sub);
    setNewStatus("");
    setStatusNotes("");
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedSubmission || !newStatus) return;
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/superadmin/submissions/${selectedSubmission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes: statusNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      toast.success(`Status updated to "${newStatus}"`, {
        description: newStatus === "placed" && data.submission?.placement_fee
          ? `Placement: $${data.submission.placement_fee} | Recruiter: $${data.submission.recruiter_payout} | Platform: $${data.submission.platform_payout}`
          : undefined,
      });
      setStatusDialogOpen(false);
      fetchSubmissions();
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Stats
  const placedCount = submissions.filter(s => s.status === "placed").length;
  const totalPlacementFees = submissions
    .filter(s => s.placement_fee)
    .reduce((sum, s) => sum + (s.placement_fee ?? 0), 0);
  const totalRecruiterPayouts = submissions
    .filter(s => s.recruiter_payout)
    .reduce((sum, s) => sum + (s.recruiter_payout ?? 0), 0);
  const totalPlatformPayouts = submissions
    .filter(s => s.platform_payout)
    .reduce((sum, s) => sum + (s.platform_payout ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
        description="All candidate submissions across all jobs. Update status to trigger payouts."
        actions={
          <Button variant="outline" size="sm" onClick={fetchSubmissions} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Send className="size-5 text-blue-600" />
          <div><p className="text-xs text-muted-foreground">Total Subs</p><p className="text-lg font-bold">{total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <div><p className="text-xs text-muted-foreground">Placed</p><p className="text-lg font-bold">{placedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <DollarSign className="size-5 text-amber-600" />
          <div><p className="text-xs text-muted-foreground">Total Fees</p><p className="text-lg font-bold">${totalPlacementFees.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <TrendingUp className="size-5 text-purple-600" />
          <div><p className="text-xs text-muted-foreground">Platform Cut</p><p className="text-lg font-bold">${totalPlatformPayouts.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by candidate name or job title..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="recruiter">Recruiter-submitted</SelectItem>
                <SelectItem value="self_apply">Self-apply</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Submissions will appear here when recruiters submit candidates to jobs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Split</TableHead>
                    <TableHead>Placement Fee</TableHead>
                    <TableHead>Recruiter Cut</TableHead>
                    <TableHead>Platform Cut</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{s.candidate.fullName}</p>
                          {s.candidate.specialty && <p className="text-xs text-muted-foreground">{s.candidate.specialty}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.job.title}</TableCell>
                      <TableCell className="text-sm">
                        {s.recruiter ? (
                          <div>
                            <p>{s.recruiter.name}</p>
                            <p className="text-xs text-muted-foreground">{s.recruiter.email}</p>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{getSubmissionTypeBadge(s.submission_type)}</TableCell>
                      <TableCell>{getStatusBadge(s.status)}</TableCell>
                      <TableCell>{getSplitBadge(s.payout_split_phase)}</TableCell>
                      <TableCell className="text-sm">{s.placement_fee ? `$${s.placement_fee.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-sm text-emerald-700">{s.recruiter_payout ? `$${s.recruiter_payout.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-sm text-amber-700">{s.platform_payout ? `$${s.platform_payout.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-7" aria-label="Update status" disabled={["placed", "rejected", "withdrawn"].includes(s.status)}>
                              <RefreshCw className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedSubmission(s); setNewStatus("reviewing"); setStatusNotes(""); setStatusDialogOpen(true); }}>
                              Mark as Reviewing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedSubmission(s); setNewStatus("interview"); setStatusNotes(""); setStatusDialogOpen(true); }}>
                              Schedule Interview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedSubmission(s); setNewStatus("offer"); setStatusNotes(""); setStatusDialogOpen(true); }}>
                              Extend Offer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedSubmission(s); setNewStatus("placed"); setStatusNotes(""); setStatusDialogOpen(true); }} className="text-emerald-700">
                              ✓ Mark as Placed (calculate payout)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedSubmission(s); setNewStatus("rejected"); setStatusNotes(""); setStatusDialogOpen(true); }} className="text-red-700">
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Status update dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Submission Status</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <>Change status for <strong>{selectedSubmission.candidate.fullName}</strong> → "{selectedSubmission.job.title}" to <strong>{newStatus}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {newStatus === "placed" && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                <p className="font-medium mb-1">Payout will be calculated automatically:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Placement fee based on job commission ({selectedSubmission?.job.commission_type === "flat" ? `$${selectedSubmission?.job.commission_amount?.toLocaleString() ?? 0} flat` : `${selectedSubmission?.job.commission_percentage ?? 0}% of salary`})</li>
                  <li>Split based on ownership window phase: {selectedSubmission?.payout_split_phase ?? "open"}</li>
                  <li>Recruiter + platform + (optional) original owner residual</li>
                </ul>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} placeholder="Internal notes about this status change..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={isUpdating || !newStatus}>
              {isUpdating ? <><Loader2 className="size-4 mr-2 animate-spin" />Updating...</> : <>Update Status</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
