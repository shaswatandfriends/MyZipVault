"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Download,
  ArrowRight,
  Building2,
  Mail,
  User,
  BarChart3,
  Activity,
} from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";

interface OverviewStats {
  totalRequested: number;
  completed: number;
  pending: number;
  avgResponseHours: number;
  completionRate: number;
  deletionRequestsPending: number;
}

interface OverviewData {
  stats: OverviewStats;
  byStatus: Record<string, number>;
  byEmploymentStatus: Record<string, number>;
  alerts: {
    stalePending: number;
    candidatesWithoutRefs: number;
    excessiveManagerRequests: number;
    incompleteResponses: number;
  };
  recentActivity: {
    requests: Array<{
      id: number;
      candidateName: string;
      facility: string;
      status: string;
      requestedAt: string;
    }>;
    submissions: Array<{
      id: number;
      candidateName: string;
      submittedAt: string | null;
    }>;
    deletions: Array<{
      id: number;
      candidateName: string;
      reason: string;
      status: string;
      createdAt: string;
    }>;
  };
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending_request":
      return <Badge className="bg-amber-100 text-amber-700 border-0 gap-1"><Clock className="size-3" />Pending</Badge>;
    case "sent":
      return <Badge className="bg-blue-100 text-blue-700 border-0 gap-1"><Mail className="size-3" />Sent</Badge>;
    case "opened":
      return <Badge className="bg-purple-100 text-purple-700 border-0 gap-1"><User className="size-3" />Opened</Badge>;
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1"><CheckCircle2 className="size-3" />Completed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

const empStatusLabel: Record<string, string> = {
  current: "Currently Working",
  ending_contract: "Ending Contract",
  past: "Past Employment",
};

export default function ReferenceOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/references/overview");
      if (!res.ok) throw new Error("Failed to fetch overview");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load reference overview");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportAll = () => {
    window.open("/api/admin/reference-questions/export-data", "_blank");
    toast.success("Export started");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reference Overview" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reference Overview" />
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load overview data.</p>
            <Button onClick={fetchData} className="mt-4" variant="outline">
              <RefreshCw className="size-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, byStatus, byEmploymentStatus, alerts, recentActivity } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reference Overview"
        description="Comprehensive dashboard for all reference activity across the platform."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-white" onClick={handleExportAll}>
              <Download className="size-4" /> Export All
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRequested}</p>
                <p className="text-xs text-muted-foreground">Total Requested</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgResponseHours}h</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.deletionRequestsPending}</p>
                <p className="text-xs text-muted-foreground">Deletion Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Status & Employment Breakdown ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reference Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                </div>
                <span className="font-semibold text-sm">{count}</span>
              </div>
            ))}
            {Object.keys(byStatus).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No references yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By Employment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byEmploymentStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge
                  className={
                    status === "current"
                      ? "bg-emerald-100 text-emerald-800 border-0"
                      : status === "ending_contract"
                        ? "bg-amber-100 text-amber-800 border-0"
                        : "bg-gray-100 text-gray-800 border-0"
                  }
                >
                  {empStatusLabel[status] || status}
                </Badge>
                <span className="font-semibold text-sm">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────── */}
      {(alerts.stalePending > 0 || alerts.candidatesWithoutRefs > 0 || alerts.excessiveManagerRequests > 0 || alerts.incompleteResponses > 0) && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Flags &amp; Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alerts.stalePending > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {alerts.stalePending} reference(s) pending &gt;7 days
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    These references have not received a response.
                  </p>
                </div>
              )}
              {alerts.candidatesWithoutRefs > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {alerts.candidatesWithoutRefs} candidate(s) with no references
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    These candidates have zero reference requests.
                  </p>
                </div>
              )}
              {alerts.excessiveManagerRequests > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {alerts.excessiveManagerRequests} manager(s) with excessive requests
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Some managers have received more than 5 reference requests.
                  </p>
                </div>
              )}
              {alerts.incompleteResponses > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {alerts.incompleteResponses} reference(s) with incomplete responses
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Completed references with missing answers.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Activity ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="size-4" /> Recent Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            {recentActivity.requests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No recent requests</p>
            ) : (
              recentActivity.requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{req.candidateName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="size-3" /> {req.facility}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" /> Recent Submissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            {recentActivity.submissions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No recent submissions</p>
            ) : (
              recentActivity.submissions.map((sub) => (
                <div key={sub.id} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium">{sub.candidateName}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Deletions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trash2 className="size-4 text-red-500" /> Recent Deletion Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            {recentActivity.deletions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No deletion requests</p>
            ) : (
              recentActivity.deletions.map((del) => (
                <div key={del.id} className="p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{del.candidateName}</p>
                    <Badge
                      className={
                        del.status === "pending"
                          ? "bg-amber-100 text-amber-700 border-0 text-[10px]"
                          : del.status === "approved"
                            ? "bg-emerald-100 text-emerald-700 border-0 text-[10px]"
                            : "bg-red-100 text-red-700 border-0 text-[10px]"
                      }
                    >
                      {del.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{del.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/superadmin/references/requests">
                View Deletion Requests <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/superadmin/references/responses">
                View All Responses <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/superadmin/references/candidates">
                Manage Candidates <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/superadmin/references/forms">
                Configure Forms <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/superadmin/references/audit-logs">
                View Audit Logs <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
