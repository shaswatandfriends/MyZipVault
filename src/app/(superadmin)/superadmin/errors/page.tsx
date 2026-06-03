"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface ErrorLog {
  id: number;
  severity: string;
  service: string;
  errorMessage: string;
  createdAt: string;
}

interface ErrorStats {
  infoCount: number;
  warningCount: number;
  criticalCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <XCircle className="size-4 text-red-600" />;
    case "warning":
      return <AlertCircle className="size-4 text-amber-600" />;
    case "info":
    default:
      return <Info className="size-4 text-blue-600" />;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Critical
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Warning
        </Badge>
      );
    case "info":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Info
        </Badge>
      );
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminErrorsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats>({ infoCount: 0, warningCount: 0, criticalCount: 0 });
  const [services, setServices] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchErrors = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        severity: severityFilter,
        service: serviceFilter,
        page: String(page),
      });
      const res = await fetch(`/api/superadmin/errors?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch errors");
      }
      const json = await res.json();
      setLogs(json.logs);
      setStats(json.stats);
      setServices(json.services);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load error logs", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [severityFilter, serviceFilter, page]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [severityFilter, serviceFilter]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchErrors();
      }, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchErrors]);

  const handleClearOld = async () => {
    try {
      setClearing(true);
      const res = await fetch("/api/superadmin/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_old_logs" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to clear logs");
      toast.success(json.message || "Old logs cleared");
      setClearOpen(false);
      fetchErrors();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear logs";
      toast.error("Clear failed", { description: message });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Error Log"
        description="Real-time error feed. Monitor platform health and troubleshoot issues."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer">
                Auto-refresh
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchErrors}
              className="gap-1"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 className="size-4" />
              Clear Old Logs
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Info (Today)</CardTitle>
            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Info className="size-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.infoCount}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warning (Today)</CardTitle>
            <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle className="size-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.warningCount}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical (Today)</CardTitle>
            <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="size-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.criticalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Table ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Error Logs</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No error logs</h3>
              <p className="text-sm text-muted-foreground">
                {severityFilter !== "all" || serviceFilter !== "all"
                  ? "Try adjusting your filters."
                  : "The system is running smoothly."}
              </p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="group">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getSeverityIcon(log.severity)}
                          {getSeverityBadge(log.severity)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.service}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate">
                        {log.errorMessage}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────────────── */}
          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {logs.length} of {total} logs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Clear Old Logs Confirmation ──────────────────────────────── */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Old Error Logs</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all error logs older than 30 days. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearOld}
              disabled={clearing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {clearing ? "Clearing…" : "Clear Old Logs"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
