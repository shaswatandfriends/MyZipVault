"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface DocumentItem {
  id: number;
  documentName: string;
  fileUrl: string;
  verificationStatus: string;
  reviewNotes: string | null;
  uploadedAt: string;
  candidate: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface DocumentsData {
  documents: DocumentItem[];
  stats: {
    pendingCount: number;
    verifiedToday: number;
    rejectedToday: number;
  };
}

type StatusFilter = "all" | "pending_review" | "verified" | "rejected";

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <Clock className="size-3" />
          Pending
        </Badge>
      );
    case "verified":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          <CheckCircle2 className="size-3" />
          Verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          <XCircle className="size-3" />
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────
function DocumentCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Skeleton className="size-20 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminDocumentsPage() {
  const [data, setData] = useState<DocumentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_review");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<DocumentItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ status: statusFilter });
      const res = await fetch(`/api/admin/documents?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch documents");
      }
      const json = (await res.json()) as DocumentsData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load documents", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleVerify = async (credentialId: number) => {
    try {
      setActionLoading(credentialId);
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", credentialId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Verification failed");
      }
      toast.success("Document verified successfully");
      fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Verification failed", { description: message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      setActionLoading(rejectTarget.id);
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          credentialId: rejectTarget.id,
          reason: rejectReason,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Rejection failed");
      }
      toast.success("Document rejected");
      setRejectDialogOpen(false);
      setRejectTarget(null);
      setRejectReason("");
      fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Rejection failed", { description: message });
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (doc: DocumentItem) => {
    setRejectTarget(doc);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Verification"
        description="Review and manage uploaded credentials. Verify or reject pending documents."
      />

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="size-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingCount ?? 0}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.verifiedToday ?? 0}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <XCircle className="size-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.rejectedToday ?? 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Filter ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="pending_review">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Documents List ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <DocumentCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.documents.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No documents found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {statusFilter === "pending_review"
                  ? "No documents are pending review right now."
                  : "No documents match the selected filter."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.documents.map((doc) => {
            const candidateName =
              [doc.candidate.firstName, doc.candidate.lastName]
                .filter(Boolean)
                .join(" ") || doc.candidate.email;
            const isPending = doc.verificationStatus === "pending_review";
            const isBusy = actionLoading === doc.id;

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail placeholder */}
                    <div className="size-20 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <FileText className="size-8 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {doc.documentName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {candidateName}
                          </p>
                        </div>
                        {getStatusBadge(doc.verificationStatus)}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded {formatDate(doc.uploadedAt)}
                      </p>

                      {doc.reviewNotes && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <AlertCircle className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {doc.reviewNotes}
                          </p>
                        </div>
                      )}

                      {isPending && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isBusy}
                            onClick={() => handleVerify(doc.id)}
                          >
                            <CheckCircle2 className="size-3.5" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isBusy}
                            onClick={() => openRejectDialog(doc)}
                          >
                            <XCircle className="size-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Reject Dialog ──────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting &ldquo;{rejectTarget?.documentName}&rdquo;.
              This reason will be visible to the candidate.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading !== null}
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
