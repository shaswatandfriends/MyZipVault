"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Clock,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  Zap,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// ─── Types ──────────────────────────────────────────────────────────
interface AuditLogUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
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

interface AuditStats {
  today: number;
  thisWeek: number;
  uniqueUsersToday: number;
  mostActiveUser: { email: string; count: number } | null;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
  stats: AuditStats;
}

// ─── Action Category Mapping ────────────────────────────────────────
const ACTION_CATEGORIES: Record<string, { label: string; actions: string[] }> = {
  authentication: {
    label: "Authentication",
    actions: ["login", "logout", "signup", "admin_proxy_login", "admin_proxy_exit", "proxy_login", "proxy_login_exit"],
  },
  users: {
    label: "Users",
    actions: ["created_user", "updated_user", "deleted_user", "reset_password", "swap_email", "suspend_member", "activate_member", "ban_member", "pending_member", "change_member_role", "add_recruiter", "account_suspended", "account_restored", "account_permanently_deleted"],
  },
  skills: {
    label: "Skills",
    actions: ["skill_created", "skill_updated", "skill_deleted", "skills_imported", "skills_deleted_all"],
  },
  templates: {
    label: "Templates",
    actions: ["template_created", "template_updated", "template_deleted"],
  },
  checklists: {
    label: "Checklists",
    actions: ["checklist_sent", "checklist_opened", "checklist_completed"],
  },
  references: {
    label: "References",
    actions: ["reference_question_created", "reference_question_updated", "reference_question_deleted", "reference_sent", "reference_completed", "reference_deletion_approved"],
  },
  companies: {
    label: "Companies",
    actions: ["company_created", "company_updated", "credits_adjusted", "create_company", "edit_company", "set_credits", "set_seat_limit", "set_baa_status", "set_company_status", "delete_company", "credits_deducted", "credits_purchased"],
  },
  documents: {
    label: "Documents",
    actions: ["admin_viewed_credential", "admin_viewed_resume", "admin_approved_document", "admin_rejected_document", "candidate_shared_document", "recruiter_unlocked_document"],
  },
  system: {
    label: "System",
    actions: ["set_baa_status", "baa_signed", "account_purged"],
  },
};

// ─── Role Options ───────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "platform_admin", label: "Platform Admin" },
  { value: "client_admin", label: "Client Admin" },
  { value: "client_recruiter", label: "Client Recruiter" },
  { value: "candidate", label: "Candidate" },
];

// ─── Entity Type Options ────────────────────────────────────────────
const ENTITY_TYPE_OPTIONS = [
  "user",
  "organization",
  "checklist_template",
  "skill",
  "reference_question",
  "candidate_reference",
  "credential",
  "share",
  "checklist_request",
  "share_request",
];

// ─── Date Range Preset ─────────────────────────────────────────────
type DatePreset = "today" | "7d" | "30d" | "custom" | "all";

// ─── Helpers ────────────────────────────────────────────────────────
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getUserDisplayName(log: AuditLogEntry): string {
  if (log.user) {
    const name = [log.user.firstName, log.user.lastName].filter(Boolean).join(" ");
    return name || log.user.email;
  }
  return "System";
}

function getUserEmail(log: AuditLogEntry): string {
  return log.user?.email ?? "N/A";
}

function getActionCategory(action: string): string {
  for (const [key, cat] of Object.entries(ACTION_CATEGORIES)) {
    if (cat.actions.includes(action)) return key;
  }
  // Fallback: infer from prefix
  if (action.includes("login") || action.includes("logout") || action.includes("signup")) return "authentication";
  if (action.startsWith("created_") || action.startsWith("create_")) return "users";
  if (action.startsWith("updated_") || action.startsWith("update_")) return "users";
  if (action.startsWith("deleted_") || action.startsWith("delete_")) return "users";
  if (action.includes("skill")) return "skills";
  if (action.includes("template")) return "templates";
  if (action.includes("checklist")) return "checklists";
  if (action.includes("reference")) return "references";
  if (action.includes("company") || action.includes("credit") || action.includes("baa")) return "companies";
  return "system";
}

function getActionBadge(action: string) {
  const category = getActionCategory(action);
  const isCreate = action.includes("created") || action.includes("create") || action.includes("add_") || action.includes("signup") || action.includes("imported");
  const isUpdate = action.includes("updated") || action.includes("update") || action.includes("edit_") || action.includes("set_") || action.includes("change_") || action.includes("swap_") || action.includes("adjust");
  const isDelete = action.includes("deleted") || action.includes("delete") || action.includes("ban_") || action.includes("purged");
  const isImport = action.includes("import") || action.includes("export");

  if (category === "authentication") {
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-[11px] font-medium">
        {action.replace(/_/g, " ")}
      </Badge>
    );
  }
  if (isDelete) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[11px] font-medium">
        {action.replace(/_/g, " ")}
      </Badge>
    );
  }
  if (isImport) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[11px] font-medium">
        {action.replace(/_/g, " ")}
      </Badge>
    );
  }
  if (isCreate) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[11px] font-medium">
        {action.replace(/_/g, " ")}
      </Badge>
    );
  }
  if (isUpdate) {
    return (
      <Badge className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50 text-[11px] font-medium">
        {action.replace(/_/g, " ")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50 text-[11px] font-medium">
      {action.replace(/_/g, " ")}
    </Badge>
  );
}

function getRoleBadge(role: string | null) {
  if (!role) return <Badge variant="outline" className="text-[10px]">—</Badge>;
  const r = role.toLowerCase();
  if (r === "super_admin") return <Badge className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 text-[10px]">Super Admin</Badge>;
  if (r === "platform_admin") return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-[10px]">Platform Admin</Badge>;
  if (r === "client_admin") return <Badge className="bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-50 text-[10px]">Client Admin</Badge>;
  if (r === "client_recruiter") return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-50 text-[10px]">Recruiter</Badge>;
  if (r === "candidate") return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px]">Candidate</Badge>;
  return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
}

function getDateRange(preset: DatePreset): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today, to: undefined };
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { from, to: undefined };
    }
    case "30d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return { from, to: undefined };
    }
    case "custom":
      return { from: undefined, to: undefined };
    case "all":
      return { from: undefined, to: undefined };
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────
function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
    </TableRow>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminAuditLogsPage() {
  // Data state
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  // UI state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [detailLog, setDetailLog] = useState<AuditLogEntry | null>(null);
  const [showActionFilter, setShowActionFilter] = useState(false);
  const [showEntityFilter, setShowEntityFilter] = useState(false);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [exporting, setExporting] = useState(false);

  const limit = 50;

  // ── Build query params ────────────────────────────────────────────
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    if (selectedActions.length > 0) {
      params.set("action", selectedActions.join(","));
    }
    if (selectedEntityTypes.length > 0) {
      params.set("entity_type", selectedEntityTypes.join(","));
    }
    if (selectedRoles.length > 0) {
      params.set("role", selectedRoles.join(","));
    }
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }

    // Date range
    if (datePreset === "custom") {
      if (customDateFrom) {
        params.set("date_from", customDateFrom.toISOString());
      }
      if (customDateTo) {
        params.set("date_to", customDateTo.toISOString());
      }
    } else if (datePreset !== "all") {
      const range = getDateRange(datePreset);
      if (range.from) {
        params.set("date_from", range.from.toISOString());
      }
    }

    return params.toString();
  }, [page, selectedActions, selectedEntityTypes, selectedRoles, searchQuery, datePreset, customDateFrom, customDateTo]);

  // ── Fetch data ────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const qs = buildQueryParams();
      const res = await fetch(`/api/superadmin/audit-logs?${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error || "Failed to fetch audit logs");
      }
      const json = (await res.json()) as AuditLogsResponse;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load audit logs", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Auto-refresh ──────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // ── Reset page on filter change ───────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [selectedActions, selectedEntityTypes, selectedRoles, searchQuery, datePreset, customDateFrom, customDateTo]);

  // ── Toggle helpers ────────────────────────────────────────────────
  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const toggleCategory = (categoryKey: string) => {
    const catActions = ACTION_CATEGORIES[categoryKey]?.actions || [];
    const allSelected = catActions.every((a) => selectedActions.includes(a));
    if (allSelected) {
      setSelectedActions((prev) => prev.filter((a) => !catActions.includes(a)));
    } else {
      setSelectedActions((prev) => [...new Set([...prev, ...catActions])]);
    }
  };

  const toggleEntityType = (et: string) => {
    setSelectedEntityTypes((prev) =>
      prev.includes(et) ? prev.filter((e) => e !== et) : [...prev, et]
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const clearAllFilters = () => {
    setSelectedActions([]);
    setSelectedEntityTypes([]);
    setSelectedRoles([]);
    setSearchQuery("");
    setDatePreset("all");
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
  };

  const hasActiveFilters = selectedActions.length > 0 || selectedEntityTypes.length > 0 || selectedRoles.length > 0 || searchQuery.trim() !== "" || datePreset !== "all";

  // ── Export CSV ────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const body: Record<string, string> = { action: "export" };
      if (selectedActions.length > 0) body.action_filter = selectedActions.join(",");
      if (selectedEntityTypes.length > 0) body.entity_type = selectedEntityTypes.join(",");
      if (selectedRoles.length > 0) body.role = selectedRoles.join(",");
      if (searchQuery.trim()) body.search = searchQuery.trim();
      if (datePreset === "custom") {
        if (customDateFrom) body.date_from = customDateFrom.toISOString();
        if (customDateTo) body.date_to = customDateTo.toISOString();
      } else if (datePreset !== "all") {
        const range = getDateRange(datePreset);
        if (range.from) body.date_from = range.from.toISOString();
      }

      const res = await fetch("/api/superadmin/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Audit logs exported successfully");
    } catch {
      toast.error("Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────
  const stats = data?.stats ?? null;

  const activeFilterCount = [
    selectedActions.length > 0 ? 1 : 0,
    selectedEntityTypes.length > 0 ? 1 : 0,
    selectedRoles.length > 0 ? 1 : 0,
    datePreset !== "all" ? 1 : 0,
  ].reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Complete platform activity log — monitor every action across the system."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label htmlFor="auto-refresh" className="text-muted-foreground cursor-pointer">
                Auto-refresh
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fetchLogs()}
              disabled={isLoading}
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.today.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Logs Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shrink-0">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.thisWeek.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Logs This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700 shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.uniqueUsersToday}</p>
                  <p className="text-xs text-muted-foreground">Unique Users Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 shrink-0">
                  <Zap className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold truncate max-w-[140px]" title={stats.mostActiveUser?.email ?? "N/A"}>
                    {stats.mostActiveUser ? stats.mostActiveUser.count : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[140px]" title={stats.mostActiveUser?.email ?? "No activity"}>
                    {stats.mostActiveUser ? stats.mostActiveUser.email : "Most Active User"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Action Type Multi-Select */}
          <Popover open={showActionFilter} onOpenChange={setShowActionFilter}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto gap-2 justify-start">
                <Filter className="size-4" />
                Action Type
                {selectedActions.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ml-1 text-[10px] px-1.5">
                    {selectedActions.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-3 border-b">
                <p className="font-medium text-sm">Filter by Action</p>
                <p className="text-xs text-muted-foreground mt-0.5">Select categories or individual actions</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-3 space-y-3">
                {Object.entries(ACTION_CATEGORIES).map(([key, cat]) => {
                  const allSelected = cat.actions.every((a) => selectedActions.includes(a));
                  const someSelected = cat.actions.some((a) => selectedActions.includes(a));
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-1">
                        <Checkbox
                          id={`cat-${key}`}
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={() => toggleCategory(key)}
                        />
                        <Label htmlFor={`cat-${key}`} className="text-sm font-medium cursor-pointer">
                          {cat.label}
                        </Label>
                      </div>
                      <div className="ml-6 space-y-1">
                        {cat.actions.map((action) => (
                          <div key={action} className="flex items-center gap-2">
                            <Checkbox
                              id={`action-${action}`}
                              checked={selectedActions.includes(action)}
                              onCheckedChange={() => toggleAction(action)}
                              className="size-3.5"
                            />
                            <Label htmlFor={`action-${action}`} className="text-xs text-muted-foreground cursor-pointer">
                              {action.replace(/_/g, " ")}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedActions.length > 0 && (
                <div className="p-3 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{selectedActions.length} selected</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedActions([])}>
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Entity Type Multi-Select */}
          <Popover open={showEntityFilter} onOpenChange={setShowEntityFilter}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto gap-2 justify-start">
                <Shield className="size-4" />
                Entity Type
                {selectedEntityTypes.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ml-1 text-[10px] px-1.5">
                    {selectedEntityTypes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-3 border-b">
                <p className="font-medium text-sm">Filter by Entity Type</p>
              </div>
              <div className="max-h-60 overflow-y-auto p-3 space-y-2">
                {ENTITY_TYPE_OPTIONS.map((et) => (
                  <div key={et} className="flex items-center gap-2">
                    <Checkbox
                      id={`et-${et}`}
                      checked={selectedEntityTypes.includes(et)}
                      onCheckedChange={() => toggleEntityType(et)}
                    />
                    <Label htmlFor={`et-${et}`} className="text-sm cursor-pointer capitalize">
                      {et.replace(/_/g, " ")}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedEntityTypes.length > 0 && (
                <div className="p-3 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{selectedEntityTypes.length} selected</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedEntityTypes([])}>
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Role Filter */}
          <Popover open={showRoleFilter} onOpenChange={setShowRoleFilter}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto gap-2 justify-start">
                <Users className="size-4" />
                Role
                {selectedRoles.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ml-1 text-[10px] px-1.5">
                    {selectedRoles.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <div className="p-3 border-b">
                <p className="font-medium text-sm">Filter by Role</p>
              </div>
              <div className="max-h-60 overflow-y-auto p-3 space-y-2">
                {ROLE_OPTIONS.map((ro) => (
                  <div key={ro.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${ro.value}`}
                      checked={selectedRoles.includes(ro.value)}
                      onCheckedChange={() => toggleRole(ro.value)}
                    />
                    <Label htmlFor={`role-${ro.value}`} className="text-sm cursor-pointer">
                      {ro.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedRoles.length > 0 && (
                <div className="p-3 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{selectedRoles.length} selected</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedRoles([])}>
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Date Range */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <Clock className="size-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Picker */}
        {datePreset === "custom" && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="size-4" />
                    {customDateFrom ? formatDateShort(customDateFrom.toISOString()) : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="size-4" />
                    {customDateTo ? formatDateShort(customDateTo.toISOString()) : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {(customDateFrom || customDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setCustomDateFrom(undefined); setCustomDateTo(undefined); }}>
                <X className="size-4 mr-1" /> Clear dates
              </Button>
            )}
          </div>
        )}

        {/* Active Filter Summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {selectedActions.length > 0 && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                {selectedActions.length} action{selectedActions.length !== 1 ? "s" : ""}
                <button onClick={() => setSelectedActions([])} className="ml-1 hover:text-destructive">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selectedEntityTypes.length > 0 && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                {selectedEntityTypes.length} entit{selectedEntityTypes.length !== 1 ? "ies" : "y"}
                <button onClick={() => setSelectedEntityTypes([])} className="ml-1 hover:text-destructive">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selectedRoles.length > 0 && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                {selectedRoles.length} role{selectedRoles.length !== 1 ? "s" : ""}
                <button onClick={() => setSelectedRoles([])} className="ml-1 hover:text-destructive">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                &quot;{searchQuery}&quot;
                <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-destructive">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {datePreset !== "all" && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                {datePreset === "custom" ? "Custom date" : datePreset === "today" ? "Today" : datePreset === "7d" ? "Last 7 days" : "Last 30 days"}
                <button onClick={() => setDatePreset("all")} className="ml-1 hover:text-destructive">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearAllFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* ── Logs Table ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {/* Table header info */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              <h2 className="text-base font-semibold">Activity Log</h2>
              {data && (
                <Badge variant="outline" className="text-xs ml-1">
                  {data.total.toLocaleString()} {data.total === 1 ? "entry" : "entries"}
                </Badge>
              )}
            </div>
            {data && (
              <span className="text-xs text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="min-w-[180px]">User</TableHead>
                  <TableHead className="w-[120px]">Role</TableHead>
                  <TableHead className="min-w-[200px]">Action</TableHead>
                  <TableHead className="w-[130px]">Entity Type</TableHead>
                  <TableHead className="w-[80px]">Entity ID</TableHead>
                  <TableHead className="w-[140px]">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !data ? (
                  Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : !data?.logs.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <Activity className="size-12 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">No audit logs found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {hasActiveFilters
                            ? "No logs match your current filters. Try adjusting your search criteria."
                            : "There are no audit log entries in the system yet."}
                        </p>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" onClick={clearAllFilters}>
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setDetailLog(log)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium shrink-0">
                            {log.user
                              ? ((log.user.firstName?.[0] || "") + (log.user.lastName?.[0] || "") || log.user.email[0]).toUpperCase()
                              : "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{getUserDisplayName(log)}</p>
                            <p className="text-xs text-muted-foreground truncate">{getUserEmail(log)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(log.role)}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-xs capitalize">
                        {log.entityType ? log.entityType.replace(/_/g, " ") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.entityId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.ipAddress ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ────────────────────────────────────────────── */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(data.page - 1) * limit + 1}–{Math.min(data.page * limit, data.total)} of {data.total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {(() => {
                    const current = data.page;
                    const total = data.totalPages;
                    const pages: (number | string)[] = [];

                    if (total <= 7) {
                      for (let i = 1; i <= total; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (current > 3) pages.push("...");
                      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                        pages.push(i);
                      }
                      if (current < total - 2) pages.push("...");
                      pages.push(total);
                    }

                    return pages.map((p, idx) =>
                      typeof p === "string" ? (
                        <span key={`dots-${idx}`} className="px-2 text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === current ? "default" : "outline"}
                          size="sm"
                          className={p === current ? "bg-emerald-600 hover:bg-emerald-700 text-white min-w-9" : "min-w-9"}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    );
                  })()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="size-5 text-emerald-600" />
              Audit Log Detail
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 mt-2">
              {/* User Section */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold shrink-0">
                  {detailLog.user
                    ? ((detailLog.user.firstName?.[0] || "") + (detailLog.user.lastName?.[0] || "") || detailLog.user.email[0]).toUpperCase()
                    : "S"}
                </div>
                <div>
                  <p className="font-medium text-sm">{getUserDisplayName(detailLog)}</p>
                  <p className="text-xs text-muted-foreground">{getUserEmail(detailLog)}</p>
                </div>
                <div className="ml-auto">
                  {getRoleBadge(detailLog.role)}
                </div>
              </div>

              {/* Detail Fields */}
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Log ID" value={String(detailLog.id)} />
                <DetailField label="User ID" value={detailLog.userId ? String(detailLog.userId) : "N/A"} />
                <DetailField label="Action" value={detailLog.action} />
                <DetailField label="Entity Type" value={detailLog.entityType || "N/A"} />
                <DetailField label="Entity ID" value={detailLog.entityId ? String(detailLog.entityId) : "N/A"} />
                <DetailField label="IP Address" value={detailLog.ipAddress || "N/A"} mono />
                <DetailField label="Timestamp" value={formatTimestamp(detailLog.createdAt)} fullWidth />
              </div>

              {/* Action Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Category:</span>
                {getActionBadge(detailLog.action)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Detail Field Component ─────────────────────────────────────────
function DetailField({ label, value, mono, fullWidth }: { label: string; value: string; mono?: boolean; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
