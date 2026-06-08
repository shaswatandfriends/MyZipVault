"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  XCircle,
  Send,
  Trash2,
} from "@/lib/icons";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReferenceItem {
  id: number;
  manager_email: string;
  manager_phone: string;
  facility_name: string;
  employment_status: string;
  status: string;
  requested_at: string;
  manager_user: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  reference_responses: {
    id: number;
    answer_text: string;
    question_id: number;
    overall_comment: string | null;
    question: {
      question_text: string;
    };
  }[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
          <CheckCircle2 className="size-3" /> Completed
        </Badge>
      );
    case "pending_request":
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
          <Clock className="size-3" /> Pending
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
          <AlertCircle className="size-3" /> Expired
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400 border-0 gap-1">
          <XCircle className="size-3" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getEmploymentLabel(status: string) {
  switch (status) {
    case "current":
      return "Current Employment";
    case "ending_contract":
      return "Ending Contract";
    case "past":
      return "Past Employment";
    default:
      return status;
  }
}

export default function CandidateReferencesPage() {
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRef, setExpandedRef] = useState<number | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Delete reference request state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRefForDeletion, setSelectedRefForDeletion] = useState<number | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
  const [pendingDeletionRequests, setPendingDeletionRequests] = useState<Set<number>>(new Set());

  // Form state
  const [managerFirstName, setManagerFirstName] = useState("");
  const [managerLastName, setManagerLastName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("current");

  const fetchReferences = useCallback(async () => {
    try {
      const res = await fetch("/api/references");
      if (!res.ok) throw new Error("Failed to fetch references");
      const data = await res.json();
      setReferences(data.references || []);

      // Also fetch pending deletion requests to know which refs have pending requests
      const delRes = await fetch("/api/references/delete-request");
      if (delRes.ok) {
        const delData = await delRes.json();
        const pendingIds = new Set<number>();
        (delData.requests || []).forEach((r: { reference_id: number; status: string }) => {
          if (r.status === "pending") pendingIds.add(r.reference_id);
        });
        setPendingDeletionRequests(pendingIds);
      }
    } catch {
      toast.error("Failed to load references");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!managerFirstName.trim() || !managerLastName.trim()) {
      toast.error("Please enter the manager's name");
      return;
    }
    if (!managerEmail.trim()) {
      toast.error("Please enter the manager's email");
      return;
    }
    if (!facilityName.trim()) {
      toast.error("Please enter the facility name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/references/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerFirstName: managerFirstName.trim(),
          managerLastName: managerLastName.trim(),
          managerEmail: managerEmail.trim(),
          managerPhone: managerPhone.trim(),
          facilityName: facilityName.trim(),
          employmentStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Failed to send request", { description: data.error });
        return;
      }

      toast.success("Reference request sent!", {
        description: `Email sent to ${managerFirstName} ${managerLastName}`,
      });

      setIsDialogOpen(false);
      setManagerFirstName("");
      setManagerLastName("");
      setManagerEmail("");
      setManagerPhone("");
      setFacilityName("");
      setEmploymentStatus("current");
      fetchReferences();
    } catch {
      toast.error("Failed to send reference request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (referenceId: number) => {
    setResendingId(referenceId);
    try {
      const res = await fetch("/api/references/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend");
      }

      toast.success("Reference request resent!", {
        description: "A new email has been sent to the manager.",
      });
      fetchReferences();
    } catch (err) {
      toast.error("Failed to resend reference", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleCancel = async (referenceId: number) => {
    setCancellingId(referenceId);
    try {
      const res = await fetch("/api/references/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }

      toast.success("Reference request cancelled");
      fetchReferences();
    } catch (err) {
      toast.error("Failed to cancel reference", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCancellingId(null);
    }
  };

  const toggleExpand = (refId: number) => {
    setExpandedRef(expandedRef === refId ? null : refId);
  };

  const handleDeleteRequest = async () => {
    if (!selectedRefForDeletion || !deletionReason.trim()) {
      toast.error("Please provide a reason for the deletion request");
      return;
    }

    setIsSubmittingDeletion(true);
    try {
      const res = await fetch("/api/references/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId: selectedRefForDeletion,
          reason: deletionReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit deletion request");
      }

      toast.success("Deletion request submitted", {
        description: "A super admin will review your request and make a decision.",
      });

      setIsDeleteDialogOpen(false);
      setSelectedRefForDeletion(null);
      setDeletionReason("");
      fetchReferences();
    } catch (err) {
      toast.error("Failed to submit deletion request", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmittingDeletion(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="References"
          actions={<Skeleton className="h-10 w-36" />}
        />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="References"
        description="Request and manage professional references from your supervisors and managers."
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="size-4" />
                Request Reference
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Request a Reference</DialogTitle>
                  <DialogDescription>
                    Ask a supervisor or manager to provide a professional reference
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="mgrFirstName">First Name</Label>
                      <Input
                        id="mgrFirstName"
                        placeholder="Jane"
                        value={managerFirstName}
                        onChange={(e) => setManagerFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mgrLastName">Last Name</Label>
                      <Input
                        id="mgrLastName"
                        placeholder="Smith"
                        value={managerLastName}
                        onChange={(e) => setManagerLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mgrEmail">Email</Label>
                    <Input
                      id="mgrEmail"
                      type="email"
                      placeholder="jane.smith@facility.com"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mgrPhone">Phone (Optional)</Label>
                    <Input
                      id="mgrPhone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facility">Facility Name</Label>
                    <Input
                      id="facility"
                      placeholder="General Hospital"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Employment Status</Label>
                    <RadioGroup value={employmentStatus} onValueChange={setEmploymentStatus}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="current" id="emp-current" />
                        <Label htmlFor="emp-current" className="font-normal text-sm">
                          Current Employment
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="ending_contract" id="emp-ending" />
                        <Label htmlFor="emp-ending" className="font-normal text-sm">
                          Ending Contract
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="past" id="emp-past" />
                        <Label htmlFor="emp-past" className="font-normal text-sm">
                          Past Employment
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-4" />
                        Send Request
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {references.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="size-7 text-primary" />
            </div>
            <h3 className="text-lg font-medium">No references yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Request professional references from your supervisors and facility
              managers. They&apos;ll receive an email to complete the reference form.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="size-4" />
              Request Your First Reference
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {references.map((ref) => {
            const isCompleted = ref.status === "completed";
            const isPending = ref.status === "pending_request";
            const isExpanded = expandedRef === ref.id;
            const managerName = ref.manager_user
              ? `${ref.manager_user.first_name || ""} ${ref.manager_user.last_name || ""}`.trim() || ref.manager_email
              : ref.manager_email;

            return (
              <Card key={ref.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : ref.status === "cancelled"
                          ? "bg-gray-100 dark:bg-gray-800/30"
                          : "bg-primary/10"
                      }`}
                    >
                      <Users
                        className={`size-5 ${
                          isCompleted
                            ? "text-emerald-600 dark:text-emerald-400"
                            : ref.status === "cancelled"
                            ? "text-gray-500 dark:text-gray-400"
                            : "text-primary"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{managerName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <Building2 className="size-3" />
                            {ref.facility_name}
                          </div>
                        </div>
                        {getStatusBadge(ref.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="capitalize">
                          {getEmploymentLabel(ref.employment_status)}
                        </span>
                        <span>·</span>
                        <span>
                          Requested {new Date(ref.requested_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action buttons for pending references */}
                      {isPending && (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-7 text-xs"
                            disabled={resendingId === ref.id}
                            onClick={() => handleResend(ref.id)}
                          >
                            {resendingId === ref.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RefreshCw className="size-3" />
                            )}
                            Resend
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-7 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                                disabled={cancellingId === ref.id}
                              >
                                {cancellingId === ref.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <XCircle className="size-3" />
                                )}
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Reference Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel the reference request to {managerName} at {ref.facility_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Request</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleCancel(ref.id)}
                                >
                                  Cancel Request
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}

                      {/* View details button for completed references */}
                      {isCompleted && ref.reference_responses?.length > 0 && (
                        <div className="mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs h-7"
                            onClick={() => toggleExpand(ref.id)}
                          >
                            View Details
                            {isExpanded ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </Button>
                          {isExpanded && (
                            <div className="mt-2 space-y-2 p-3 bg-muted/50 rounded-lg">
                              {ref.reference_responses.map((response) => (
                                <div key={response.id}>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {response.question?.question_text || `Question ${response.question_id}`}
                                  </p>
                                  <p className="text-sm mt-0.5">{response.answer_text}</p>
                                </div>
                              ))}
                              {ref.reference_responses[0]?.overall_comment && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Overall Comment
                                  </p>
                                  <p className="text-sm mt-0.5">
                                    {ref.reference_responses[0].overall_comment}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Delete Reference Request button — for completed or cancelled references */}
                      {(isCompleted || ref.status === "cancelled") && !isPending && (
                        <div className="mt-3 pt-3 border-t">
                          {pendingDeletionRequests.has(ref.id) ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <Clock className="size-3" />
                              Deletion request pending — awaiting admin review
                            </p>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedRefForDeletion(ref.id);
                                setDeletionReason("");
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="size-3" />
                              Delete Reference
                            </Button>
                          )}
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

      {/* Delete Reference Request Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Request to Delete Reference
            </DialogTitle>
            <DialogDescription>
              This will submit a deletion request to a super admin. They will review your reason and decide whether to delete the reference. You cannot undo this request once submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRefForDeletion && (() => {
              const selectedRef = references.find((r) => r.id === selectedRefForDeletion);
              if (!selectedRef) return null;
              const managerName = selectedRef.manager_user
                ? `${selectedRef.manager_user.first_name || ""} ${selectedRef.manager_user.last_name || ""}`.trim() || selectedRef.manager_email
                : selectedRef.manager_email;
              return (
                <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                  <p className="text-sm font-medium">{managerName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="size-3" />
                    {selectedRef.facility_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {selectedRef.status === "completed" ? "Completed" : "Cancelled"}
                  </p>
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label htmlFor="deletion-reason">
                Please mention a valid reason why you want to delete this reference
              </Label>
              <Textarea
                id="deletion-reason"
                placeholder="e.g., The manager provided incorrect information, I no longer wish to use this reference, etc."
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                A super admin will review your request and make the final decision.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedRefForDeletion(null);
                setDeletionReason("");
              }}
              disabled={isSubmittingDeletion}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmittingDeletion || !deletionReason.trim()}
              className="gap-2"
              onClick={handleDeleteRequest}
            >
              {isSubmittingDeletion ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
