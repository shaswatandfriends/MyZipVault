"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  Mail,
  Phone,
  User,
} from "@/lib/icons";
import { toast } from "sonner";

interface DeletionRequestItem {
  id: number;
  reason: string;
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  candidate_user: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    candidate_profile: {
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    } | null;
  };
  reference: {
    id: number;
    manager_email: string;
    manager_phone: string;
    facility_name: string;
    employment_status: string;
    status: string;
    manager_user: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    reference_responses: { id: number }[];
  };
  reviewer: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
          <Clock className="size-3" /> Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
          <CheckCircle2 className="size-3" /> Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
          <XCircle className="size-3" /> Rejected
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function RefRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequestItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequestItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/superadmin/reference-requests?status=${activeTab}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data.requests || []);
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0, total: 0 });
    } catch {
      toast.error("Failed to load reference requests");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleReview = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/reference-requests/${selectedRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process request");
      }

      toast.success(
        reviewAction === "approve"
          ? "Reference deletion approved"
          : "Deletion request rejected",
        {
          description: reviewAction === "approve"
            ? "The candidate has been notified and the reference has been deleted."
            : "The candidate has been notified that their request was rejected.",
        }
      );

      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes("");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to process request", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewDialog = (request: DeletionRequestItem, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes("");
    setIsReviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ref Deletion Requests" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ref Deletion Requests"
        description="Review and manage candidate requests to delete references. Only super admins can approve or reject these requests."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="size-7 text-primary" />
                </div>
                <h3 className="text-lg font-medium">No reference requests</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  When candidates request deletion of a reference, those requests will appear here for your review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="w-full">
              <div className="space-y-3">
                {requests.map((request) => {
                  const candidateName = request.candidate_user.candidate_profile
                    ? `${request.candidate_user.candidate_profile.first_name || ""} ${request.candidate_user.candidate_profile.last_name || ""}`.trim() || request.candidate_user.email
                    : `${request.candidate_user.first_name || ""} ${request.candidate_user.last_name || ""}`.trim() || request.candidate_user.email;
                  const managerName = request.reference.manager_user
                    ? `${request.reference.manager_user.first_name || ""} ${request.reference.manager_user.last_name || ""}`.trim() || request.reference.manager_email
                    : request.reference.manager_email;

                  return (
                    <Card key={request.id} className="group hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <Trash2 className="size-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">
                                  Deletion Request #{request.id}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Submitted {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Candidate</p>
                                <div className="flex items-center gap-2">
                                  <User className="size-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{candidateName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="size-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{request.candidate_user.email}</span>
                                </div>
                                {request.candidate_user.candidate_profile?.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="size-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{request.candidate_user.candidate_profile.phone}</span>
                                  </div>
                                )}
                              </div>

                              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference to Delete</p>
                                <div className="flex items-center gap-2">
                                  <Users className="size-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{managerName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Building2 className="size-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{request.reference.facility_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="size-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{request.reference.manager_email}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Reason for Deletion</p>
                              <p className="text-sm text-red-900 dark:text-red-300">{request.reason}</p>
                            </div>

                            {request.status !== "pending" && request.reviewer && (
                              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Reviewed by {request.reviewer.first_name || ""} {request.reviewer.last_name || ""} on {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : "N/A"}
                                </p>
                                {request.review_notes && (
                                  <p className="text-sm">{request.review_notes}</p>
                                )}
                              </div>
                            )}

                            {request.status === "pending" && (
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1.5 h-8"
                                  onClick={() => openReviewDialog(request, "approve")}
                                >
                                  <Trash2 className="size-3.5" />
                                  Approve Deletion
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 h-8"
                                  onClick={() => openReviewDialog(request, "reject")}
                                >
                                  <XCircle className="size-3.5" />
                                  Reject Request
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
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Confirmation Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === "approve" ? (
                <>
                  <Trash2 className="size-5 text-destructive" />
                  Approve Reference Deletion
                </>
              ) : (
                <>
                  <AlertCircle className="size-5 text-amber-500" />
                  Reject Deletion Request
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "This will permanently delete the reference and all its responses. The candidate will be notified. This action cannot be undone."
                : "The candidate will be notified that their deletion request was rejected."}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Reference Details</p>
                <p className="text-sm">
                  {selectedRequest.reference.manager_user
                    ? `${selectedRequest.reference.manager_user.first_name || ""} ${selectedRequest.reference.manager_user.last_name || ""}`.trim() || selectedRequest.reference.manager_email
                    : selectedRequest.reference.manager_email}
                  {" at "}
                  {selectedRequest.reference.facility_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Candidate reason: &ldquo;{selectedRequest.reason}&rdquo;
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-notes">
                  {reviewAction === "approve" ? "Notes (optional)" : "Rejection reason (optional but recommended)"}
                </Label>
                <Textarea
                  id="review-notes"
                  placeholder={reviewAction === "approve"
                    ? "Add any internal notes about this decision..."
                    : "Explain why the request was rejected. This will be shared with the candidate."}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsReviewDialogOpen(false);
                setSelectedRequest(null);
                setReviewNotes("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewAction === "approve" ? "destructive" : "default"}
              disabled={isSubmitting}
              className="gap-2"
              onClick={handleReview}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </>
              ) : reviewAction === "approve" ? (
                <>
                  <Trash2 className="size-4" />
                  Confirm Deletion
                </>
              ) : (
                <>
                  <XCircle className="size-4" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
