"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Inbox, Clock, CheckCircle2, XCircle, Loader2, User, Mail,
  ClipboardCheck, ChevronRight,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ChecklistRequest {
  id: number;
  candidateUserId: number;
  candidateName: string;
  candidateEmail: string;
  profession: string;
  specialty: string;
  requestedChecklist: string;
  notes: string;
  status: "pending" | "fulfilled" | "rejected";
  created_at: string;
  fulfilledAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface ChecklistTemplate {
  id: number;
  name: string;
  profession: string;
  specialty: string;
}

export default function ChecklistRequestsPage() {
  const [requests, setRequests] = useState<ChecklistRequest[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Fulfill dialog
  const [fulfillRequest, setFulfillRequest] = useState<ChecklistRequest | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, tplRes] = await Promise.all([
        fetch(`/api/superadmin/skills/checklist-requests?status=${statusFilter}`),
        fetch("/api/checklists/templates"),
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests || []);
      }

      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTemplates(tplData.templates || []);
      }
    } catch {
      toast.error("Failed to load checklist requests");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFulfill = async () => {
    if (!fulfillRequest || !selectedTemplate) {
      toast.error("Please select a checklist template");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/superadmin/skills/checklist-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fulfill",
          requestId: fulfillRequest.id,
          templateId: selectedTemplate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fulfill");
      }

      toast.success("Checklist assigned! Candidate has been notified.");
      setFulfillRequest(null);
      setSelectedTemplate(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to fulfill request", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!confirm("Reject this checklist request? The candidate will be notified.")) return;

    try {
      const res = await fetch("/api/superadmin/skills/checklist-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", requestId }),
      });

      if (!res.ok) throw new Error("Failed to reject");

      toast.success("Request rejected. Candidate has been notified.");
      fetchData();
    } catch {
      toast.error("Failed to reject request");
    }
  };

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    fulfilled: requests.filter((r) => r.status === "fulfilled").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklist Requests"
        description="Candidates who requested a specific skills checklist from admin."
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.fulfilled}</p>
              <p className="text-xs text-muted-foreground">Fulfilled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending Only</SelectItem>
            <SelectItem value="fulfilled">Fulfilled Only</SelectItem>
            <SelectItem value="rejected">Rejected Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && requests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No checklist requests</p>
            <p className="text-xs text-muted-foreground mt-1">
              When candidates request a checklist from admin, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Request List */}
      {!isLoading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Candidate info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {req.candidateName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{req.candidateName}</p>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" /> {req.candidateEmail}
                        </span>
                        {req.profession && (
                          <span className="flex items-center gap-1">
                            <ClipboardCheck className="size-3" /> {req.profession}
                          </span>
                        )}
                        {req.specialty && <span>• {req.specialty}</span>}
                      </div>
                      {req.requestedChecklist && (
                        <p className="text-xs mt-1">
                          <span className="text-muted-foreground">Requested:</span>{" "}
                          <span className="font-medium">{req.requestedChecklist}</span>
                        </p>
                      )}
                      {req.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1">&ldquo;{req.notes}&rdquo;</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setFulfillRequest(req);
                            setSelectedTemplate(null);
                          }}
                        >
                          <CheckCircle2 className="size-3.5" /> Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleReject(req.id)}
                        >
                          <XCircle className="size-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {req.status === "fulfilled" && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <CheckCircle2 className="size-3" /> Fulfilled
                        {req.fulfilledAt && ` · ${new Date(req.fulfilledAt).toLocaleDateString()}`}
                      </Badge>
                    )}
                    {req.status === "rejected" && (
                      <Badge variant="outline" className="text-xs gap-1 text-red-600">
                        <XCircle className="size-3" /> Rejected
                        {req.rejectedAt && ` · ${new Date(req.rejectedAt).toLocaleDateString()}`}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fulfill Dialog — Select checklist template */}
      <Dialog open={!!fulfillRequest} onOpenChange={(open) => !open && setFulfillRequest(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Assign Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              Assign a checklist template to <span className="font-medium text-foreground">{fulfillRequest?.candidateName}</span>.
              They will be notified immediately.
            </div>
            <div className="space-y-2">
              <Label>Select Checklist Template</Label>
              <Select value={selectedTemplate?.toString() || ""} onValueChange={(v) => setSelectedTemplate(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="— Select a template —" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id.toString()}>
                      {tpl.name} ({tpl.profession}
                      {tpl.specialty ? ` - ${tpl.specialty}` : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillRequest(null)}>Cancel</Button>
            <Button onClick={handleFulfill} disabled={isProcessing || !selectedTemplate} className="gap-2">
              {isProcessing && <Loader2 className="size-4 animate-spin" />}
              Assign & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>;
    case "fulfilled":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Fulfilled</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}
