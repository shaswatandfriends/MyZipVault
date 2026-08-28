"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Shield, RefreshCw, AlertTriangle, Loader2, CheckCircle2, XCircle, MessageSquare,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface DisputeRow {
  id: number;
  review_id: number;
  reason_category: string;
  explanation: string;
  status: string;
  resolution: string | null;
  admin_notes: string | null;
  admin_annotation: string | null;
  created_at: string;
  resolved_at: string | null;
  review: {
    id: number;
    recruiter_user_id: number;
    reviewer_role: string;
    professionalism: number;
    communication: number;
    job_match: number;
    process_speed: number;
    post_placement: number;
    comment: string | null;
    is_anonymous: boolean;
    recruiter_reply: string | null;
    created_at: string;
  };
  recruiter: { id: number; first_name: string | null; last_name: string | null; email: string } | null;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    investigating: "bg-blue-100 text-blue-700 border-blue-200",
    upheld: "bg-gray-100 text-gray-700 border-gray-200",
    removed: "bg-red-100 text-red-700 border-red-200",
    annotated: "bg-amber-100 text-amber-700 border-amber-200",
    dismissed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

export default function ReviewDisputesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <ReviewDisputesInner />
    </Suspense>
  );
}

function ReviewDisputesInner() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(null);
  const [resolution, setResolution] = useState("review_kept");
  const [adminNotes, setAdminNotes] = useState("");
  const [adminAnnotation, setAdminAnnotation] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const fetchDisputes = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/superadmin/review-disputes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setDisputes(json.disputes ?? []);
    } catch { toast.error("Failed to load disputes"); }
    finally { setIsLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchDisputes(), 400);
    return () => clearTimeout(timeout);
  }, [fetchDisputes]);

  const handleResolve = async () => {
    if (!selectedDispute) return;
    try {
      setIsResolving(true);
      const res = await fetch(`/api/superadmin/review-disputes/${selectedDispute.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, admin_notes: adminNotes, admin_annotation: adminAnnotation }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      toast.success("Dispute resolved");
      setResolveDialogOpen(false);
      setAdminNotes("");
      setAdminAnnotation("");
      fetchDisputes();
    } catch { toast.error("Failed to resolve dispute"); }
    finally { setIsResolving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Review Disputes" description="Recruiter challenges to negative reviews. Resolve by keeping, removing, or annotating the review."
        actions={<Button variant="outline" size="sm" onClick={fetchDisputes} disabled={isLoading}><RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>} />

      <Card>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="upheld">Upheld (Review Kept)</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
              <SelectItem value="annotated">Annotated</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : disputes.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No disputes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Review Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((d) => {
                    const avgScore = ((d.review.professionalism + d.review.communication + d.review.job_match + d.review.process_speed + d.review.post_placement) / 5).toFixed(1);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">
                          {d.recruiter ? `${d.recruiter.first_name ?? ""} ${d.recruiter.last_name ?? ""}`.trim() || d.recruiter.email : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{d.reason_category.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-sm font-semibold">{avgScore}/10</TableCell>
                        <TableCell>{getStatusBadge(d.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {d.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedDispute(d);
                              setResolution("review_kept");
                              setAdminNotes("");
                              setAdminAnnotation("");
                              setResolveDialogOpen(true);
                            }}>Resolve</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Resolve Dispute #{selectedDispute?.id}</DialogTitle>
            <DialogDescription>Review the dispute details and decide the outcome.</DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4 py-2 max-h-96 overflow-y-auto">
              {/* Original review */}
              <div className="rounded-md bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Original Review (avg {((selectedDispute.review.professionalism + selectedDispute.review.communication + selectedDispute.review.job_match + selectedDispute.review.process_speed + selectedDispute.review.post_placement) / 5).toFixed(1)}/10):</p>
                <div className="grid grid-cols-5 gap-1 text-xs">
                  <span>Prof: {selectedDispute.review.professionalism}</span>
                  <span>Comm: {selectedDispute.review.communication}</span>
                  <span>Match: {selectedDispute.review.job_match}</span>
                  <span>Speed: {selectedDispute.review.process_speed}</span>
                  <span>Post: {selectedDispute.review.post_placement}</span>
                </div>
                {selectedDispute.review.comment && <p className="text-sm">{selectedDispute.review.comment}</p>}
                {selectedDispute.review.recruiter_reply && (
                  <div className="border-l-2 border-border pl-2">
                    <p className="text-xs font-semibold text-muted-foreground">Recruiter reply:</p>
                    <p className="text-sm text-muted-foreground">{selectedDispute.review.recruiter_reply}</p>
                  </div>
                )}
              </div>
              {/* Dispute reason */}
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-800">Dispute Reason: {selectedDispute.reason_category.replace(/_/g, " ")}</p>
                <p className="text-sm text-amber-900">{selectedDispute.explanation}</p>
              </div>
              {/* Resolution form */}
              <div>
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="review_kept">Keep Review (dispute dismissed)</SelectItem>
                    <SelectItem value="review_removed">Remove Review (dispute upheld)</SelectItem>
                    <SelectItem value="review_annotated">Annotate Review (add admin note)</SelectItem>
                    <SelectItem value="recruiter_warned">Keep + Warn Recruiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {resolution === "review_annotated" && (
                <div>
                  <Label htmlFor="annotation">Public Annotation (shown under the review)</Label>
                  <Textarea id="annotation" value={adminAnnotation} onChange={(e) => setAdminAnnotation(e.target.value)} rows={3} placeholder="e.g., The recruiter provided evidence that this review contains factual errors. The platform has verified this claim." />
                </div>
              )}
              <div>
                <Label htmlFor="notes">Internal Notes (not shown publicly)</Label>
                <Textarea id="notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes about this resolution..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)} disabled={isResolving}>Cancel</Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving ? <><Loader2 className="size-4 mr-2 animate-spin" />Resolving...</> : <>Resolve Dispute</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
