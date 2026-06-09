"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Shield,
  Inbox,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Types ──────────────────────────────────────────────────────────
interface AuditLogItem {
  id: number;
  action: string;
  entityType: string | null;
  entityId: number | null;
  ipAddress: string | null;
  role: string | null;
  createdAt: string;
  user: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  } | null;
}

interface AuditLogsData {
  logs: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getName(user: { firstName: string | null; lastName: string | null; email: string } | null): string {
  if (!user) return "System";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

function getActionBadge(action: string) {
  if (action.includes("created") || action.includes("_create")) {
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">{action}</Badge>;
  }
  if (action.includes("updated") || action.includes("_update") || action.includes("extended")) {
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[10px]">{action}</Badge>;
  }
  if (action.includes("deleted") || action.includes("_delete") || action.includes("delete_all")) {
    return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 text-[10px]">{action}</Badge>;
  }
  if (action.includes("import")) {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">{action}</Badge>;
  }
  if (action.includes("sent") || action.includes("completed") || action.includes("opened")) {
    return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-[10px]">{action}</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">{action}</Badge>;
}

function getRoleBadge(role: string | null) {
  if (!role) return <Badge variant="outline" className="text-[10px]">System</Badge>;
  switch (role) {
    case "super_admin":
      return <Badge className="bg-gray-900 text-white border-gray-900 hover:bg-gray-900 text-[10px]">Super Admin</Badge>;
    case "platform_admin":
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-[10px]">Admin</Badge>;
    case "client_admin":
      return <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100 text-[10px]">Client Admin</Badge>;
    case "client_recruiter":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[10px]">Recruiter</Badge>;
    case "candidate":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">Candidate</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
  }
}

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "checklist_sent", label: "Checklist Sent" },
  { value: "checklist_completed", label: "Checklist Completed" },
  { value: "checklist_opened", label: "Checklist Opened" },
  { value: "skill_created", label: "Skill Created" },
  { value: "skill_updated", label: "Skill Updated" },
  { value: "skill_deleted", label: "Skill Deleted" },
  { value: "template_created", label: "Template Created" },
  { value: "template_updated", label: "Template Updated" },
  { value: "template_deleted", label: "Template Deleted" },
  { value: "skills_imported", label: "Skills Imported" },
  { value: "skills_deleted_all", label: "All Skills Deleted" },
  { value: "checklist_expiry_extended", label: "Expiry Extended" },
  { value: "checklist_response_deleted", label: "Response Deleted" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All Entity Types" },
  { value: "checklist_template", label: "Checklist Template" },
  { value: "skill", label: "Skill" },
  { value: "candidate_checklist_response", label: "Checklist Response" },
  { value: "checklist_request", label: "Checklist Request" },
];

// ─── Main Component ─────────────────────────────────────────────────
export default function SkillsAuditLogsPage() {
  const [data, setData] = useState<AuditLogsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (searchQuery) params.set("search", searchQuery);
      if (filterAction) params.set("action", filterAction);
      if (filterEntityType) params.set("entityType", filterEntityType);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);

      const res = await fetch(`/api/superadmin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch audit logs");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load audit logs", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, filterAction, filterEntityType, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Skills checklist-related audit trail"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* ─── Filters ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search actions..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select value={filterAction} onValueChange={(v) => { setFilterAction(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Actions</SelectItem>
                  {ACTION_OPTIONS.filter((o) => o.value).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entity Type</Label>
              <Select value={filterEntityType} onValueChange={(v) => { setFilterEntityType(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Types</SelectItem>
                  {ENTITY_OPTIONS.filter((o) => o.value).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">&nbsp;</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full"
                onClick={() => {
                  setSearchQuery("");
                  setFilterAction("");
                  setFilterEntityType("");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Table ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="size-5 text-emerald-600" />
              Audit Trail
              {data && (
                <Badge variant="outline" className="text-xs">
                  {data.total} total
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : !data?.logs.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No audit logs found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {getName(log.user)}
                        </TableCell>
                        <TableCell>{getRoleBadge(log.role)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.entityType || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.entityId ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.ipAddress || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((data.page - 1) * data.pageSize) + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page >= data.totalPages}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
