"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ScrollText,
  Search,
  Calendar,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Download,
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

// ─── Types ──────────────────────────────────────────────────────────

interface AuditLogItem {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  role: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  ipAddress: string | null;
  createdAt: string;
}

// ─── Badge Helpers ──────────────────────────────────────────────────

function getActionBadge(action: string) {
  if (action.startsWith("CREATE")) {
    return (
      <Badge className="text-xs" style={{ background: "#DCFCE7", color: "#166534", border: "none" }}>
        {action}
      </Badge>
    );
  }
  if (action.startsWith("UPDATE")) {
    return (
      <Badge className="text-xs" style={{ background: "#DBEAFE", color: "#1E40AF", border: "none" }}>
        {action}
      </Badge>
    );
  }
  if (action.startsWith("DELETE")) {
    return (
      <Badge className="text-xs" style={{ background: "#FEE2E2", color: "#991B1B", border: "none" }}>
        {action}
      </Badge>
    );
  }
  if (action.startsWith("RESEND")) {
    return (
      <Badge className="text-xs" style={{ background: "#FEF3C7", color: "#92400E", border: "none" }}>
        {action}
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs">{action}</Badge>;
}

function getEntityTypeBadge(type: string | null) {
  switch (type) {
    case "CandidateReference":
      return (
        <Badge className="text-xs" style={{ background: "#E0E7FF", color: "#3730A3", border: "none" }}>
          CandidateReference
        </Badge>
      );
    case "ReferenceQuestion":
      return (
        <Badge className="text-xs" style={{ background: "#FCE7F3", color: "#9D174D", border: "none" }}>
          ReferenceQuestion
        </Badge>
      );
    case "ReferenceResponse":
      return (
        <Badge className="text-xs" style={{ background: "#ECFDF5", color: "#065F46", border: "none" }}>
          ReferenceResponse
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{type || "—"}</Badge>;
  }
}

function formatDateTime(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReferenceAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/superadmin/reference/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch audit logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load audit logs", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo, searchQuery, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const exportCSV = () => {
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["ID", "User", "Email", "Role", "Action", "Entity Type", "Entity ID", "IP Address", "Timestamp"];
    const rows = logs.map((log) => [
      log.id,
      log.userName || "System",
      log.userEmail || "",
      log.role || "",
      log.action,
      log.entityType || "",
      log.entityId || "",
      log.ipAddress || "",
      log.createdAt,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reference-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 animate-page-fade">
      <PageHeader
        title="Reference Audit Logs"
        description="Track all administrative actions on reference requests, questions, and responses."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="gap-1.5"
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        }
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
                  placeholder="User email, action, entity type..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Action
              </label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE_REFERENCE_QUESTION">Create Question</SelectItem>
                  <SelectItem value="UPDATE_REFERENCE_QUESTION">Update Question</SelectItem>
                  <SelectItem value="DELETE_REFERENCE_QUESTION">Delete Question</SelectItem>
                  <SelectItem value="RESEND_REFERENCE_REQUEST">Resend Request</SelectItem>
                  <SelectItem value="DELETE_REFERENCE_REQUEST">Delete Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                From
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 size-4" style={{ color: "var(--text-muted)" }} />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="pl-9 w-[160px]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                To
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 size-4" style={{ color: "var(--text-muted)" }} />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="pl-9 w-[160px]"
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              size="sm"
              className="text-white h-9"
              style={{ background: "var(--primary)" }}
            >
              <Filter className="size-3.5 mr-1" />
              Search
            </Button>
            {(actionFilter !== "all" || dateFrom || dateTo || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter("all");
                  setDateFrom("");
                  setDateTo("");
                  setSearchQuery("");
                  setSearchInput("");
                  setPage(1);
                }}
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Clear filters
              </Button>
            )}
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
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ScrollText className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                No audit logs found
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Reference-related audit entries will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {log.userName || "System"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {log.userEmail || "—"}
                          </p>
                          {log.role && (
                            <Badge className="text-[10px] mt-0.5" style={{ background: "#F3F4F6", color: "#6B7280", border: "none" }}>
                              {log.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>{getEntityTypeBadge(log.entityType)}</TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {log.entityId ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                        {log.ipAddress || "—"}
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
    </div>
  );
}
