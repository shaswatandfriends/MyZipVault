"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Loader2,
  Inbox,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────

interface OverviewStats {
  totalRequests: number;
  pending: number;
  completed: number;
  sent: number;
  expired: number;
  responseRate: number;
}

interface RecentRequest {
  id: number;
  candidateName: string;
  candidateEmail: string;
  managerEmail: string;
  managerPhone: string;
  facilityName: string;
  employmentStatus: string;
  status: string;
  requestedAt: string;
}

interface OverviewData {
  stats: OverviewStats;
  recentRequests: RecentRequest[];
}

// ─── Badge Helpers ──────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_request":
      return (
        <Badge className="text-xs" style={{ background: "var(--badge-yellow-bg)", color: "var(--status-amber-dark)", border: "none" }}>
          Pending Request
        </Badge>
      );
    case "sent":
      return (
        <Badge className="text-xs" style={{ background: "var(--badge-blue-bg)", color: "var(--status-blue-dark)", border: "none" }}>
          Sent
        </Badge>
      );
    case "completed":
      return (
        <Badge className="text-xs" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}>
          Completed
        </Badge>
      );
    case "expired":
      return (
        <Badge className="text-xs" style={{ background: "var(--badge-red-bg)", color: "var(--status-red-dark)", border: "none" }}>
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getEmploymentBadge(status: string) {
  switch (status) {
    case "current":
      return (
        <Badge className="text-xs" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}>
          Current
        </Badge>
      );
    case "ending_contract":
      return (
        <Badge className="text-xs" style={{ background: "var(--badge-yellow-bg)", color: "var(--status-amber-dark)", border: "none" }}>
          Ending Contract
        </Badge>
      );
    case "past":
      return (
        <Badge className="text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "none" }}>
          Past
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReferenceOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/superadmin/reference/overview?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch overview");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load overview", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 animate-page-fade">
      <PageHeader
        title="Reference Overview"
        description="Monitor reference request activity, response rates, and recent submissions."
      />

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            From
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 size-4" style={{ color: "var(--text-muted)" }} />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
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
              onChange={(e) => setDateTo(e.target.value)}
              className="pl-9 w-[160px]"
            />
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Total Requests
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: "var(--primary-light)" }}>
                <FileText className="size-4" style={{ color: "var(--primary)" }} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {data?.stats.totalRequests ?? 0}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                All reference requests
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Pending
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: "var(--badge-yellow-bg)" }}>
                <Clock className="size-4" style={{ color: "var(--status-amber-dark)" }} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {data?.stats.pending ?? 0}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Awaiting response
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Completed
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: "var(--primary-light)" }}>
                <CheckCircle2 className="size-4" style={{ color: "var(--primary)" }} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {data?.stats.completed ?? 0}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Successfully received
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Response Rate
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: "var(--primary-light)" }}>
                <TrendingUp className="size-4" style={{ color: "var(--primary)" }} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {data?.stats.responseRate ?? 0}%
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Completed / Total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Requests Table */}
      <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Reference Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !data?.recentRequests || data.recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No reference requests found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Manager Email</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {req.candidateName}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {req.managerEmail}
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {req.facilityName}
                      </TableCell>
                      <TableCell>{getEmploymentBadge(req.employmentStatus)}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {formatDate(req.requestedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
