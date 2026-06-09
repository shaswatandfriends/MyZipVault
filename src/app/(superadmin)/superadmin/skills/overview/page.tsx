"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  CheckCircle2,
  Send,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Users,
  FileDown,
  FileSpreadsheet,
  Eye,
  Pencil,
  Inbox,
  Ban,
  BarChart3,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// ─── Types ──────────────────────────────────────────────────────────
interface OverviewStats {
  totalTemplates: number;
  totalSkills: number;
  totalRequests: number;
  completedRequests: number;
  completionRate: number;
  activeResponses: number;
  expiringSoon: number;
}

interface RecentRequest {
  id: number;
  status: string;
  completionPct: number;
  createdAt: string;
  openedAt: string | null;
  clientUser: { id: number; firstName: string | null; lastName: string | null; email: string };
  candidateUser: { id: number; firstName: string | null; lastName: string | null; email: string };
  checklistTemplate: { id: number; profession: string; specialty: string; name: string };
}

interface ExpiringChecklist {
  responseId: number;
  validUntil: string;
  status: string;
  candidate: { id: number; firstName: string | null; lastName: string | null; email: string };
  template: { profession: string; specialty: string };
}

interface ExcessiveRecruiter {
  recruiter: { id: number; firstName: string | null; lastName: string | null; email: string };
  candidateId: number;
  requestCount: number;
}

interface OverviewData {
  stats: OverviewStats;
  recentRequests: RecentRequest[];
  flags: {
    expiringChecklists: ExpiringChecklist[];
    templatesWithNoSkills: Array<{ id: number; profession: string; specialty: string; name: string; is_active: boolean }>;
    inactiveTemplatesWithPending: Array<{ id: number; profession: string; specialty: string; name: string }>;
    excessiveRecruiters: ExcessiveRecruiter[];
  };
  requestsByProfession: Array<{ profession: string; count: number }>;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Completed</Badge>;
    case "opened":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Opened</Badge>;
    case "sent":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Sent</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getName(user: { firstName: string | null; lastName: string | null; email: string }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SkillsOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/skills/overview");
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasFlags =
    data &&
    ((data.flags.expiringChecklists?.length ?? 0) > 0 ||
      (data.flags.templatesWithNoSkills?.length ?? 0) > 0 ||
      (data.flags.inactiveTemplatesWithPending?.length ?? 0) > 0 ||
      (data.flags.excessiveRecruiters?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills Checklist Overview"
        description="Central monitoring hub for all skills checklist activity"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* ─── Stats Cards ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <ClipboardList className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.totalTemplates}</p>
                  <p className="text-xs text-muted-foreground">Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 shrink-0">
                  <Database className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.totalSkills}</p>
                  <p className="text-xs text-muted-foreground">Total Skills</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shrink-0">
                  <Send className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.totalRequests}</p>
                  <p className="text-xs text-muted-foreground">Requests Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-green-50 text-green-700 shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700 shrink-0">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.activeResponses}</p>
                  <p className="text-xs text-muted-foreground">Active Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${data.stats.expiringSoon > 0 ? "border-l-amber-500" : "border-l-gray-400"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${data.stats.expiringSoon > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500"}`}>
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.expiringSoon}</p>
                  <p className="text-xs text-muted-foreground">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Recent Activity ───────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-5 text-emerald-600" />
              Recent Checklist Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : !data?.recentRequests.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Inbox className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No recent requests</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {data.recentRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {getName(req.candidateUser)}
                        </p>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.checklistTemplate.profession} — {req.checklistTemplate.specialty} • Sent by {getName(req.clientUser)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(req.createdAt)}</p>
                      {req.status !== "sent" && (
                        <div className="mt-1 w-20">
                          <Progress value={req.completionPct} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground mt-0.5">{req.completionPct}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Flags / Alerts ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              Flags &amp; Alerts
              {hasFlags && <Badge className="bg-amber-100 text-amber-800 border-amber-200 ml-1">{(data?.flags.expiringChecklists?.length ?? 0) + (data?.flags.templatesWithNoSkills?.length ?? 0) + (data?.flags.inactiveTemplatesWithPending?.length ?? 0) + (data?.flags.excessiveRecruiters?.length ?? 0)}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded" />
                ))}
              </div>
            ) : !hasFlags ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="size-10 text-emerald-500 mb-3" />
                <p className="text-sm text-muted-foreground">No flags or alerts</p>
                <p className="text-xs text-muted-foreground mt-1">Everything looks good!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {/* Expiring checklists */}
                {(data?.flags.expiringChecklists?.length ?? 0) > 0 && (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                    <p className="text-xs font-semibold text-amber-800 mb-2">
                      <Clock className="size-3.5 inline mr-1" />
                      Expiring Checklists ({data!.flags.expiringChecklists.length})
                    </p>
                    {data!.flags.expiringChecklists.slice(0, 5).map((e) => (
                      <p key={e.responseId} className="text-xs text-amber-700 ml-5">
                        {getName(e.candidate)} — {e.template.profession}/{e.template.specialty} (expires {formatDate(e.validUntil)})
                      </p>
                    ))}
                  </div>
                )}

                {/* Templates with no skills */}
                {(data?.flags.templatesWithNoSkills?.length ?? 0) > 0 && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <p className="text-xs font-semibold text-red-800 mb-2">
                      <Database className="size-3.5 inline mr-1" />
                      Empty Templates ({data!.flags.templatesWithNoSkills.length})
                    </p>
                    {data!.flags.templatesWithNoSkills.slice(0, 5).map((t) => (
                      <p key={t.id} className="text-xs text-red-700 ml-5">
                        {t.profession} — {t.specialty}
                      </p>
                    ))}
                  </div>
                )}

                {/* Inactive templates with pending requests */}
                {(data?.flags.inactiveTemplatesWithPending?.length ?? 0) > 0 && (
                  <div className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <p className="text-xs font-semibold text-orange-800 mb-2">
                      <Ban className="size-3.5 inline mr-1" />
                      Inactive with Pending Requests ({data!.flags.inactiveTemplatesWithPending.length})
                    </p>
                    {data!.flags.inactiveTemplatesWithPending.slice(0, 5).map((t) => (
                      <p key={t.id} className="text-xs text-orange-700 ml-5">
                        {t.profession} — {t.specialty}
                      </p>
                    ))}
                  </div>
                )}

                {/* Excessive recruiter requests */}
                {(data?.flags.excessiveRecruiters?.length ?? 0) > 0 && (
                  <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                    <p className="text-xs font-semibold text-yellow-800 mb-2">
                      <AlertTriangle className="size-3.5 inline mr-1" />
                      Excessive Requests ({data!.flags.excessiveRecruiters.length})
                    </p>
                    {data!.flags.excessiveRecruiters.slice(0, 5).map((r, i) => (
                      <p key={i} className="text-xs text-yellow-700 ml-5">
                        {getName(r.recruiter)} sent {r.requestCount} requests to same candidate
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="size-5 text-emerald-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => window.open("/api/admin/skills/export-template", "_blank")}
              >
                <FileSpreadsheet className="size-6 text-emerald-600" />
                <span className="text-xs">Export Template</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => window.open("/api/admin/skills/export-data", "_blank")}
              >
                <FileDown className="size-6 text-blue-600" />
                <span className="text-xs">Export Data</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => toast.info("Use the Skills Database page to import data")}
              >
                <Upload className="size-6 text-purple-600" />
                <span className="text-xs">Import Data</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => toast.info("Navigate to Skills Database to preview checklists")}
              >
                <Eye className="size-6 text-teal-600" />
                <span className="text-xs">Preview</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Requests by Profession Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-5 text-emerald-600" />
              Requests by Profession
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
            ) : !data?.requestsByProfession.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No request data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.requestsByProfession
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 8)
                  .map((item) => {
                    const maxCount = data.requestsByProfession.reduce((max, p) => Math.max(max, p.count), 0);
                    const pct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
                    return (
                      <div key={item.profession} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate">{item.profession}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">{item.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
