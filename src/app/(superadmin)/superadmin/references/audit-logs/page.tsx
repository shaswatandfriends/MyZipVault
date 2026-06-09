"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  Search,
  RefreshCw,
  Clock,
  Shield,
  FileSignature,
  Trash2,
  Pencil,
  Plus,
  CheckCircle2,
  XCircle,
  Mail,
  Eye,
} from "@/lib/icons";
import { toast } from "sonner";

// Reference-related action types
const REFERENCE_ACTIONS = [
  "reference_sent",
  "reference_completed",
  "reference_deleted",
  "reference_question_created",
  "reference_question_updated",
  "reference_question_deleted",
  "reference_deletion_approved",
  "reference_deletion_rejected",
] as const;

interface AuditLogItem {
  id: number;
  user_id: number | null;
  role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  ip_address: string | null;
  created_at: string;
  user?: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AuditData {
  logs: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getActionBadge(action: string) {
  if (action.includes("created") || action.includes("completed") || action.includes("approved")) {
    return <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1"><Plus className="size-3" />{action}</Badge>;
  }
  if (action.includes("deleted") || action.includes("rejected")) {
    return <Badge className="bg-red-100 text-red-700 border-0 gap-1"><Trash2 className="size-3" />{action}</Badge>;
  }
  if (action.includes("updated") || action.includes("sent")) {
    return <Badge className="bg-amber-100 text-amber-700 border-0 gap-1"><Pencil className="size-3" />{action}</Badge>;
  }
  return <Badge variant="secondary">{action}</Badge>;
}

function getActionIcon(action: string) {
  if (action.includes("sent")) return <Mail className="size-4 text-blue-500" />;
  if (action.includes("completed")) return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (action.includes("deleted")) return <Trash2 className="size-4 text-red-500" />;
  if (action.includes("created")) return <Plus className="size-4 text-emerald-500" />;
  if (action.includes("updated")) return <Pencil className="size-4 text-amber-500" />;
  if (action.includes("approved")) return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (action.includes("rejected")) return <XCircle className="size-4 text-red-500" />;
  return <Shield className="size-4 text-muted-foreground" />;
}

export default function RefAuditLogsPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("action_filter", actionFilter);
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);

      const res = await fetch(`/api/superadmin/analytics?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      // The analytics endpoint returns general audit data, but we need reference-specific
      // For now, let's fetch from a dedicated approach
      const allParams = new URLSearchParams();
      // Build reference action filter
      const actions = actionFilter === "all" ? REFERENCE_ACTIONS.join(",") : actionFilter;
      allParams.set("actions", actions);
      allParams.set("page", String(page));
      allParams.set("limit", "20");
      if (search) allParams.set("search", search);

      const auditRes = await fetch(`/api/superadmin/references/audit-logs?${allParams}`);
      if (!auditRes.ok) throw new Error("Failed to fetch audit logs");
      const json = await auditRes.json();
      setData(json);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [search, actionFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ref Audit Logs" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ref Audit Logs"
        description="Track all reference-related actions: sent, completed, deleted, question changes, and deletion reviews."
        actions={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user email..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="reference_sent">Reference Sent</SelectItem>
                <SelectItem value="reference_completed">Reference Completed</SelectItem>
                <SelectItem value="reference_deleted">Reference Deleted</SelectItem>
                <SelectItem value="reference_question_created">Question Created</SelectItem>
                <SelectItem value="reference_question_updated">Question Updated</SelectItem>
                <SelectItem value="reference_question_deleted">Question Deleted</SelectItem>
                <SelectItem value="reference_deletion_approved">Deletion Approved</SelectItem>
                <SelectItem value="reference_deletion_rejected">Deletion Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {!data?.logs || data.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Eye className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No reference audit logs found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Audit logs will appear when reference-related actions are performed.
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {getActionIcon(log.action)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(log.created_at).toLocaleDateString()}
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-4">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user ? (
                          <span>
                            {log.user.first_name || ""} {log.user.last_name || ""}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({log.user.email})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {log.role || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.entity_type && (
                          <span>
                            {log.entity_type}
                            {log.entity_id && ` #${log.entity_id}`}
                          </span>
                        )}
                        {!log.entity_type && "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.ip_address || "—"}
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
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
