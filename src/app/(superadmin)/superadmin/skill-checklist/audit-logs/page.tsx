"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  ShieldCheck,
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

interface AuditLogUser {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface AuditLogEntry {
  id: number;
  userId: number | null;
  role: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  ipAddress: string | null;
  createdAt: string;
  user: AuditLogUser | null;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "Create", label: "Create" },
  { value: "Update", label: "Update" },
  { value: "Delete", label: "Delete" },
  { value: "Login", label: "Login" },
  { value: "Send", label: "Send" },
  { value: "View", label: "View" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Entity Types" },
  { value: "Profession", label: "Profession" },
  { value: "Specialty", label: "Specialty" },
  { value: "SkillCategory", label: "Skill Category" },
  { value: "Skill", label: "Skill" },
  { value: "ChecklistRequest", label: "Checklist Request" },
  { value: "CandidateChecklistResponse", label: "Checklist Response" },
];

const PAGE_SIZE = 25;

// ─── Helpers ────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatEntityType(type: string | null): string {
  if (!type) return "—";
  // Convert PascalCase/camelCase to readable words
  return type.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function getActionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("create")) {
    return (
      <Badge
        className="text-xs font-medium"
        style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}
      >
        {action}
      </Badge>
    );
  }
  if (lower.includes("update") || lower.includes("edit")) {
    return (
      <Badge
        className="text-xs font-medium"
        style={{ background: "#DBEAFE", color: "#1E40AF", border: "none" }}
      >
        {action}
      </Badge>
    );
  }
  if (lower.includes("delete") || lower.includes("remove")) {
    return (
      <Badge
        className="text-xs font-medium"
        style={{ background: "#FEE2E2", color: "#991B1B", border: "none" }}
      >
        {action}
      </Badge>
    );
  }
  if (lower.includes("login") || lower.includes("auth")) {
    return (
      <Badge
        className="text-xs font-medium"
        style={{ background: "#E0E7FF", color: "#3730A3", border: "none" }}
      >
        {action}
      </Badge>
    );
  }
  if (lower.includes("send")) {
    return (
      <Badge
        className="text-xs font-medium"
        style={{ background: "#FEF3C7", color: "#92400E", border: "none" }}
      >
        {action}
      </Badge>
    );
  }
  if (lower.includes("view")) {
    return (
      <Badge
        className="text-xs font-medium"
        style={{ background: "#F3E8FF", color: "#6B21A8", border: "none" }}
      >
        {action}
      </Badge>
    );
  }
  return (
    <Badge
      className="text-xs font-medium"
      style={{
        background: "var(--surface-2)",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
      }}
    >
      {action}
    </Badge>
  );
}

function getRoleBadge(role: string | null) {
  if (!role) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const colors: Record<string, { bg: string; color: string }> = {
    super_admin: { bg: "#FEE2E2", color: "#991B1B" },
    platform_admin: { bg: "#FEF3C7", color: "#92400E" },
    client_admin: { bg: "#DBEAFE", color: "#1E40AF" },
    client_recruiter: { bg: "#E0E7FF", color: "#3730A3" },
    candidate: { bg: "var(--primary-light)", color: "var(--primary)" },
  };
  const c = colors[role] || { bg: "var(--surface-2)", color: "var(--text-muted)" };
  return (
    <Badge
      className="text-xs font-medium"
      style={{ background: c.bg, color: c.color, border: "none" }}
    >
      {role.replace(/_/g, " ")}
    </Badge>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function SkillChecklistAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // ─── Fetch audit logs ─────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityTypeFilter !== "all") params.set("entityType", entityTypeFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (userSearch.trim()) params.set("search", userSearch.trim());

      const res = await fetch(
        `/api/superadmin/skill-checklist/audit-logs?${params.toString()}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch audit logs");
      }
      const data: AuditLogResponse = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load audit logs", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, entityTypeFilter, dateFrom, dateTo, userSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ─── Reset page when filters change ─────────────────────────────

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const handleEntityTypeFilterChange = (value: string) => {
    setEntityTypeFilter(value);
    setPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
    setPage(1);
  };

  const clearFilters = () => {
    setActionFilter("all");
    setEntityTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setUserSearch("");
    setPage(1);
  };

  const hasActiveFilters =
    actionFilter !== "all" ||
    entityTypeFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    userSearch.trim() !== "";

  // ─── Export CSV ──────────────────────────────────────────────────

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: String(10000), // Fetch all for export
      });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityTypeFilter !== "all") params.set("entityType", entityTypeFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (userSearch.trim()) params.set("search", userSearch.trim());

      const res = await fetch(
        `/api/superadmin/skill-checklist/audit-logs?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to export");
      const data: AuditLogResponse = await res.json();

      const headers = [
        "Timestamp",
        "User Email",
        "User Name",
        "Role",
        "Action",
        "Entity Type",
        "Entity ID",
        "IP Address",
      ];
      const rows = data.logs.map((log) => [
        formatTimestamp(log.createdAt),
        log.user?.email ?? "—",
        [log.user?.firstName, log.user?.lastName].filter(Boolean).join(" ") || "—",
        log.role ?? "—",
        log.action,
        log.entityType ?? "—",
        log.entityId?.toString() ?? "—",
        log.ipAddress ?? "—",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `skill-checklist-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  // ─── Pagination helpers ──────────────────────────────────────────

  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-page-fade">
      <PageHeader
        title="Skill Checklist Audit Logs"
        description="Track all checklist-related actions across the platform — who did what, when, and from where."
        actions={
          <Button
            className="text-white gap-2"
            style={{ background: "var(--primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#14532D")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
            onClick={exportCSV}
            disabled={isLoading}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      {/* ── Filters Card ──────────────────────────────────────────── */}
      <Card
        className="rounded-2xl"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4" style={{ color: "var(--text-muted)" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Filters
            </span>
            {hasActiveFilters && (
              <Badge
                className="text-[10px] px-1.5 py-0"
                style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}
              >
                Active
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Action Type */}
            <Select value={actionFilter} onValueChange={handleActionFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Entity Type */}
            <Select value={entityTypeFilter} onValueChange={handleEntityTypeFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="w-full"
            />

            {/* Date To */}
            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="w-full"
            />

            {/* User Search */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by user email…"
                value={userSearch}
                onChange={(e) => handleUserSearchChange(e.target.value)}
                className="w-full pr-8"
              />
              {userSearch && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  onClick={() => handleUserSearchChange("")}
                >
                  <X className="size-3.5" style={{ color: "var(--text-muted)" }} />
                </button>
              )}
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              style={{ borderColor: "var(--border)" }}
            >
              <X className="size-3.5" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Results Summary ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4" style={{ color: "var(--text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isLoading ? "Loading…" : `${total.toLocaleString()} log ${total === 1 ? "entry" : "entries"} found`}
          </span>
        </div>
        {totalPages > 1 && (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* ── Table Card ─────────────────────────────────────────────── */}
      <Card
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "var(--border)" }}>
                <TableHead className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Timestamp
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  User
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Role
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Action
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Entity Type
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Entity ID
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  IP Address
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} style={{ borderColor: "var(--border)" }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full max-w-[120px] rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow style={{ borderColor: "var(--border)" }}>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="size-8" style={{ color: "var(--text-muted)" }} />
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        No audit logs found matching your filters
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          style={{ color: "var(--primary)" }}
                          onClick={clearFilters}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="group"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <TableCell className="text-xs whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                      {formatTimestamp(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {log.user?.email ?? "—"}
                        </span>
                        {log.user && (log.user.firstName || log.user.lastName) && (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {[log.user.firstName, log.user.lastName].filter(Boolean).join(" ")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(log.role)}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {formatEntityType(log.entityType)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-sm font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--surface-2)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {log.entityId ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {log.ipAddress ?? "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{" "}
            {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ borderColor: "var(--border)" }}
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {getVisiblePages().map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isLoading}
                onClick={() => setPage(p)}
                {...(p === page
                  ? {
                      style: { background: "var(--primary)", color: "#fff" },
                    }
                  : {
                      style: { borderColor: "var(--border)" },
                    })}
              >
                {p}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ borderColor: "var(--border)" }}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
