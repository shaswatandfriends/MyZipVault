"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Flag, Search, RefreshCw, AlertTriangle, ShieldCheck, Loader2,
  CheckCircle2, XCircle,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface ReportRow {
  id: number;
  recruiter_user_id: number;
  reporter_role: string;
  reason_category: string;
  description: string;
  status: string;
  priority: string;
  resolution_notes: string | null;
  resolution_action: string | null;
  resolved_at: string | null;
  created_at: string;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    investigating: "bg-blue-100 text-blue-700 border-blue-200",
    resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dismissed: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

function getPriorityBadge(priority: string) {
  const map: Record<string, string> = {
    low: "text-gray-600",
    normal: "text-blue-600",
    high: "text-amber-600",
    urgent: "text-red-600",
  };
  return <span className={`text-xs font-semibold ${map[priority] ?? ""}`}>{priority.toUpperCase()}</span>;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <ReportsInner />
    </Suspense>
  );
}

function ReportsInner() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [resolutionAction, setResolutionAction] = useState("no_action");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/superadmin/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setReports(json.reports ?? json ?? []);
    } catch (err) {
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchReports(), 400);
    return () => clearTimeout(timeout);
  }, [fetchReports]);

  const handleResolve = async () => {
    if (!selectedReport) return;
    try {
      setIsResolving(true);
      const res = await fetch(`/api/superadmin/reports/${selectedReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolution_action: resolutionAction,
          resolution_notes: resolutionNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      toast.success("Report resolved");
      setResolveDialogOpen(false);
      setResolutionNotes("");
      fetchReports();
    } catch {
      toast.error("Failed to resolve report");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Formal complaints filed against recruiters. Review and resolve."
        actions={<Button variant="outline" size="sm" onClick={fetchReports} disabled={isLoading}><RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>} />

      <Card>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <Flag className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.reason_category.replace(/_/g, " ")}</TableCell>
                      <TableCell>{getPriorityBadge(r.priority)}</TableCell>
                      <TableCell className="text-sm max-w-md truncate">{r.description}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {r.status === "pending" || r.status === "investigating" ? (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedReport(r); setResolveDialogOpen(true); }}>Resolve</Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{r.resolution_action ?? "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report #{selectedReport?.id}</DialogTitle>
            <DialogDescription>{selectedReport?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Action</Label>
              <Select value={resolutionAction} onValueChange={setResolutionAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_action">No Action</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="temp_suspension">Temporary Suspension</SelectItem>
                  <SelectItem value="perm_ban">Permanent Ban</SelectItem>
                  <SelectItem value="rtr_revoked">RTR Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Resolution Notes</Label>
              <Textarea id="notes" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={4} placeholder="Internal notes about this resolution..." />
            </div>
            {resolutionAction !== "no_action" && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <AlertTriangle className="size-4 inline mr-1" />
                {resolutionAction === "temp_suspension" && "This will suspend the recruiter's account temporarily."}
                {resolutionAction === "perm_ban" && "This will PERMANENTLY ban the recruiter."}
                {resolutionAction === "rtr_revoked" && "This will revoke the recruiter's RTR privileges."}
                {resolutionAction === "warning" && "A formal warning will be issued."}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)} disabled={isResolving}>Cancel</Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving ? <><Loader2 className="size-4 mr-2 animate-spin" />Resolving...</> : <>Resolve</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
