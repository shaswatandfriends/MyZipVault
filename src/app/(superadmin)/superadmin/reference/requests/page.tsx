"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Eye,
  Send,
  Trash2,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────

interface ReferenceResponse {
  id: number;
  questionText: string;
  responseType: string;
  answerText: string;
  overallComment: string | null;
  digitalSignature: string | null;
  signatureDate: string | null;
  submittedAt: string | null;
}

interface ReferenceRequest {
  id: number;
  candidateName: string;
  candidateEmail: string;
  managerEmail: string;
  managerPhone: string;
  managerName: string | null;
  facilityName: string;
  employmentStatus: string;
  status: string;
  requestedAt: string;
  responses: ReferenceResponse[];
}

// ─── Badge Helpers ──────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_request":
      return (
        <Badge className="text-xs" style={{ background: "#FEF3C7", color: "#92400E", border: "none" }}>
          Pending Request
        </Badge>
      );
    case "sent":
      return (
        <Badge className="text-xs" style={{ background: "#DBEAFE", color: "#1E40AF", border: "none" }}>
          Sent
        </Badge>
      );
    case "completed":
      return (
        <Badge className="text-xs" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}>
          Completed
        </Badge>
      );
    case "expired":
      return (
        <Badge className="text-xs" style={{ background: "#FEE2E2", color: "#991B1B", border: "none" }}>
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getEmploymentBadge(status: string) {
  switch (status) {
    case "current":
      return (
        <Badge className="text-xs" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}>
          Current
        </Badge>
      );
    case "ending_contract":
      return (
        <Badge className="text-xs" style={{ background: "#FEF3C7", color: "#92400E", border: "none" }}>
          Ending Contract
        </Badge>
      );
    case "past":
      return (
        <Badge className="text-xs" style={{ background: "#F3F4F6", color: "var(--text-secondary)", border: "none" }}>
          Past
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getResponseTypeLabel(type: string) {
  switch (type) {
    case "rating_5":
      return "1-5 Rating";
    case "rating_3":
      return "1-3 Rating";
    case "yes_no":
      return "Yes/No";
    case "text":
      return "Text";
    default:
      return type;
  }
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReferenceRequestsPage() {
  const [requests, setRequests] = useState<ReferenceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employmentFilter, setEmploymentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReferenceRequest | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReferenceRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (employmentFilter !== "all") params.set("employmentStatus", employmentFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/superadmin/reference/requests?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch requests");
      }
      const data = await res.json();
      setRequests(data.requests || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load requests", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, employmentFilter, searchQuery, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleResend = async (ref: ReferenceRequest) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/reference/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", referenceId: ref.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to resend");
      }
      toast.success("Reference email resent successfully");
      fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to resend email", { description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/reference/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", referenceId: deleteTarget.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete");
      }
      toast.success("Reference request deleted successfully");
      fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to delete request", { description: message });
    } finally {
      setActionLoading(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const openDetail = (ref: ReferenceRequest) => {
    setSelectedRequest(ref);
    setDetailOpen(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 animate-page-fade">
      <PageHeader
        title="Reference Requests"
        description="View and manage all candidate reference requests across the platform."
      />

      {/* Filters */}
      <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4" style={{ color: "var(--text-muted)" }} />
                <Input
                  placeholder="Candidate name, manager email, facility..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Status
              </label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_request">Pending Request</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Employment
              </label>
              <Select value={employmentFilter} onValueChange={(v) => { setEmploymentFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="ending_contract">Ending Contract</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              size="sm"
              className="text-white h-9"
              style={{ background: "var(--primary)" }}
            >
              <Filter className="size-3.5 mr-1" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                No reference requests found
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Adjust your filters or wait for new requests
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Manager Email</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {req.candidateName}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {req.managerEmail}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {req.facilityName}
                      </TableCell>
                      <TableCell>{getEmploymentBadge(req.employmentStatus)}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {formatDate(req.requestedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openDetail(req)}
                            title="View details"
                          >
                            <Eye className="size-4" style={{ color: "var(--text-muted)" }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleResend(req)}
                            disabled={actionLoading}
                            title="Resend email"
                          >
                            <Send className="size-4" style={{ color: "#1E40AF" }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setDeleteTarget(req);
                              setDeleteOpen(true);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
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
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reference Request Details</DialogTitle>
            <DialogDescription>
              Full details for reference request #{selectedRequest?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Candidate</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedRequest.candidateName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {selectedRequest.candidateEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Manager</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedRequest.managerName || "External Manager"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {selectedRequest.managerEmail}
                  </p>
                  {selectedRequest.managerPhone && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {selectedRequest.managerPhone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Facility</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {selectedRequest.facilityName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Employment Status</p>
                  {getEmploymentBadge(selectedRequest.employmentStatus)}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Request Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Requested Date</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {formatDate(selectedRequest.requestedAt)}
                  </p>
                </div>
              </div>

              {/* Responses (if completed) */}
              {selectedRequest.responses.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                      Reference Responses
                    </h4>
                    <div className="space-y-3">
                      {selectedRequest.responses.map((resp) => (
                        <div
                          key={resp.id}
                          className="rounded-lg border p-3"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {resp.questionText}
                            </p>
                            <Badge
                              className="text-[10px]"
                              style={{
                                background: "var(--surface-2)",
                                color: "var(--text-muted)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              {getResponseTypeLabel(resp.responseType)}
                            </Badge>
                          </div>
                          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                            {resp.answerText}
                          </p>
                          {resp.overallComment && (
                            <div className="mt-2 rounded-md p-2" style={{ background: "var(--surface-2)" }}>
                              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Overall Comment</p>
                              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                                {resp.overallComment}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedRequest.responses.length === 0 && (
                <>
                  <Separator />
                  <div className="text-center py-4">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No responses yet — this reference request is still pending.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reference Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the reference request from{" "}
              <strong>{deleteTarget?.candidateName}</strong> to{" "}
              <strong>{deleteTarget?.managerEmail}</strong>? This action cannot be undone.
              All associated responses will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
