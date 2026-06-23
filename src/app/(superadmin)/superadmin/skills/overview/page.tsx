"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardList,
  CheckCircle2,
  Send,
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Download,
  Upload,
  RefreshCw,
  Users,
  FileDown,
  FileSpreadsheet,
  Eye,
  BarChart3,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Building2,
} from "@/lib/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, ListChecks, Loader2 } from "@/lib/icons";

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
    case "in_progress":
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">In Progress</Badge>;
    case "sent":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Sent</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getName(user: { firstName: string | null; lastName: string | null; email: string }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

// ─── Skeletons ───────────────────────────────────────────────────────
function HeroCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-10 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SkillsOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hasFlags =
    data &&
    ((data.flags.expiringChecklists?.length ?? 0) > 0 ||
      (data.flags.templatesWithNoSkills?.length ?? 0) > 0 ||
      (data.flags.inactiveTemplatesWithPending?.length ?? 0) > 0 ||
      (data.flags.excessiveRecruiters?.length ?? 0) > 0);

  const totalFlags =
    (data?.flags.expiringChecklists?.length ?? 0) +
    (data?.flags.templatesWithNoSkills?.length ?? 0) +
    (data?.flags.inactiveTemplatesWithPending?.length ?? 0) +
    (data?.flags.excessiveRecruiters?.length ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills Checklist"
        description="Central monitoring hub for all skills checklist activity"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ═══════════════════════════════════════════════════════════════
          HERO METRIC CARDS — 3 prominent gradient cards
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <HeroCardSkeleton />
            <HeroCardSkeleton />
            <HeroCardSkeleton />
          </>
        ) : data ? (
          <>
            {/* ── Card 1: Templates & Skills ──────────────────────── */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all group/card border-0 bg-gradient-to-br from-teal-600 to-teal-700 text-white"
              onClick={() => router.push("/superadmin/skills")}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Database className="size-5 text-white" />
                  </div>
                  <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                </div>
                <div className="text-3xl font-bold tracking-tight">{data.stats.totalTemplates}</div>
                <p className="text-sm text-teal-100 font-medium mt-0.5">Checklist Templates</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-[11px] px-2">
                    {data.stats.totalSkills} Total Skills
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-[11px] px-2">
                    {data.stats.activeResponses} Active Responses
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* ── Card 2: Requests & Completion ───────────────────── */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all group/card border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white"
              onClick={() => router.push("/superadmin/skills/users")}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <TrendingUp className="size-5 text-white" />
                  </div>
                  <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                </div>
                <div className="text-3xl font-bold tracking-tight">{data.stats.completionRate}%</div>
                <p className="text-sm text-emerald-100 font-medium mt-0.5">Completion Rate</p>
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/70 transition-all duration-500"
                      style={{ width: `${data.stats.completionRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span>{data.stats.completedRequests} of {data.stats.totalRequests} completed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Card 3: Platform Health / Flags ─────────────────── */}
            <Card
              className={`cursor-pointer hover:shadow-lg transition-all group/card border-0 text-white ${
                totalFlags > 3
                  ? "bg-gradient-to-br from-red-600 to-red-700"
                  : totalFlags > 0
                  ? "bg-gradient-to-br from-amber-500 to-amber-600"
                  : "bg-gradient-to-br from-violet-600 to-violet-700"
              }`}
              onClick={() => {
                if (data?.flags.expiringChecklists?.length) router.push("/superadmin/skills/users");
                else if (data?.flags.templatesWithNoSkills?.length) router.push("/superadmin/skills");
                else router.push("/superadmin/skills/audit-logs");
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Activity className="size-5 text-white" />
                  </div>
                  <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                </div>
                <div className="text-3xl font-bold tracking-tight">{totalFlags > 0 ? totalFlags : "0"}</div>
                <p className="text-sm font-medium mt-0.5 opacity-90">{totalFlags > 0 ? "Flags & Alerts" : "All Clear"}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {data.stats.expiringSoon > 0 && (
                    <Badge className="bg-white/30 text-white border-0 text-[11px] px-2">
                      <Clock className="size-3 mr-1" />{data.stats.expiringSoon} Expiring
                    </Badge>
                  )}
                  {(data.flags.templatesWithNoSkills?.length ?? 0) > 0 && (
                    <Badge className="bg-white/30 text-white border-0 text-[11px] px-2">
                      <Database className="size-3 mr-1" />{data.flags.templatesWithNoSkills!.length} Empty
                    </Badge>
                  )}
                  {totalFlags === 0 && (
                    <Badge className="bg-white/15 text-white/80 border-0 text-[11px] px-2">
                      <CheckCircle2 className="size-3 mr-1" />No issues detected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          COMPLETED CHECKLIST VALIDITY — global config card
      ═══════════════════════════════════════════════════════════════ */}
      <CompletedChecklistValidityCard />

      {/* ═══════════════════════════════════════════════════════════════
          RECENT REQUESTS + FLAGS & ALERTS — Two-column layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Recent Activity ───────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Checklist Requests</CardTitle>
                <CardDescription>Latest activity across all organizations</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
                <Link href="/superadmin/skills/users">
                  <ArrowUpRight className="size-3.5" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : !data?.recentRequests.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-14 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                  <Send className="size-7 text-teal-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No checklist requests yet</p>
                <p className="text-xs text-muted-foreground mt-1">Requests will appear here once recruiters start sending checklists</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {data.recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push("/superadmin/skills/users")}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[10px] font-semibold shrink-0">
                          {req.candidateUser.firstName?.[0]?.toUpperCase() ?? req.candidateUser.email[0]?.toUpperCase()}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {getName(req.candidateUser)}
                        </p>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 ml-9">
                        {req.checklistTemplate.profession} — {req.checklistTemplate.specialty} · by {getName(req.clientUser)}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Flags &amp; Alerts</CardTitle>
                <CardDescription>
                  {totalFlags > 0 ? `${totalFlags} items need attention` : "No issues detected"}
                </CardDescription>
              </div>
              {totalFlags > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">{totalFlags}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded" />
                ))}
              </div>
            ) : !hasFlags ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="size-7 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">No flags or alerts right now</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {/* Expiring checklists */}
                {(data?.flags.expiringChecklists?.length ?? 0) > 0 && (
                  <div
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => router.push("/superadmin/skills/users")}
                  >
                    <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Expiring Checklists ({data!.flags.expiringChecklists.length})
                    </p>
                    {data!.flags.expiringChecklists.slice(0, 4).map((e) => (
                      <p key={e.responseId} className="text-xs text-amber-700 ml-5">
                        {getName(e.candidate)} — {e.template.profession}/{e.template.specialty} (expires {formatDate(e.validUntil)})
                      </p>
                    ))}
                  </div>
                )}

                {/* Templates with no skills */}
                {(data?.flags.templatesWithNoSkills?.length ?? 0) > 0 && (
                  <div
                    className="p-3 rounded-lg border border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => router.push("/superadmin/skills")}
                  >
                    <p className="text-xs font-semibold text-red-800 mb-1.5 flex items-center gap-1">
                      <Database className="size-3.5" />
                      Empty Templates ({data!.flags.templatesWithNoSkills.length})
                    </p>
                    {data!.flags.templatesWithNoSkills.slice(0, 4).map((t) => (
                      <p key={t.id} className="text-xs text-red-700 ml-5">
                        {t.profession} — {t.specialty}
                      </p>
                    ))}
                  </div>
                )}

                {/* Inactive templates with pending requests */}
                {(data?.flags.inactiveTemplatesWithPending?.length ?? 0) > 0 && (
                  <div
                    className="p-3 rounded-lg border border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => router.push("/superadmin/skills")}
                  >
                    <p className="text-xs font-semibold text-orange-800 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="size-3.5" />
                      Inactive with Pending ({data!.flags.inactiveTemplatesWithPending.length})
                    </p>
                    {data!.flags.inactiveTemplatesWithPending.slice(0, 4).map((t) => (
                      <p key={t.id} className="text-xs text-orange-700 ml-5">
                        {t.profession} — {t.specialty}
                      </p>
                    ))}
                  </div>
                )}

                {/* Excessive recruiter requests */}
                {(data?.flags.excessiveRecruiters?.length ?? 0) > 0 && (
                  <div
                    className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => router.push("/superadmin/skills/recruiters")}
                  >
                    <p className="text-xs font-semibold text-yellow-800 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="size-3.5" />
                      Excessive Requests ({data!.flags.excessiveRecruiters.length})
                    </p>
                    {data!.flags.excessiveRecruiters.slice(0, 4).map((r, i) => (
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

      {/* ═══════════════════════════════════════════════════════════════
          REQUESTS BY PROFESSION CHART + QUICK ACTIONS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Profession Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Requests by Profession</CardTitle>
                <CardDescription>Distribution of checklist requests across specialties</CardDescription>
              </div>
              <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <BarChart3 className="size-4 text-teal-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !data?.requestsByProfession.length ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <BarChart3 className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No request data yet</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.requestsByProfession.sort((a, b) => b.count - a.count).slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis
                      type="category"
                      dataKey="profession"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      width={75}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`${value} requests`, "Count"]}
                    />
                    <Bar dataKey="count" fill="var(--accent-teal)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Jump to common checklist management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-teal-300 hover:bg-teal-50/50">
                <Link href="/superadmin/skills">
                  <Database className="size-5 text-teal-600" />
                  <span className="text-xs">Skills Database</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-emerald-300 hover:bg-emerald-50/50">
                <Link href="/superadmin/skills/users">
                  <Users className="size-5 text-emerald-600" />
                  <span className="text-xs">Candidates</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-blue-300 hover:bg-blue-50/50">
                <Link href="/superadmin/skills/recruiters">
                  <UserCheck className="size-5 text-blue-600" />
                  <span className="text-xs">Recruiters</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:border-purple-300 hover:bg-purple-50/50"
                onClick={() => window.open("/api/admin/skills/export-template", "_blank")}
              >
                <FileSpreadsheet className="size-5 text-purple-600" />
                <span className="text-xs">Export Template</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:border-amber-300 hover:bg-amber-50/50"
                onClick={() => window.open("/api/admin/skills/export-data", "_blank")}
              >
                <FileDown className="size-5 text-amber-600" />
                <span className="text-xs">Export Data</span>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-gray-300 hover:bg-gray-50/50">
                <Link href="/superadmin/skills/audit-logs">
                  <Activity className="size-5 text-gray-600" />
                  <span className="text-xs">Audit Logs</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Completed Checklist Validity Card ───────────────────────────────
// Reads/writes the global `checklist_validity_days` PlatformSetting via
// /api/superadmin/settings (uses the same update-setting action).
function CompletedChecklistValidityCard() {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchValue = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/settings");
      if (!res.ok) return;
      const json = await res.json();
      const setting = (json.settings ?? []).find(
        (s: { settingKey: string; settingValue: string }) =>
          s.settingKey === "checklist_validity_days"
      );
      setValue(setting?.settingValue ?? "365");
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 3650) {
      toast.error("Please enter a number between 1 and 3650 days");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update-setting",
          settingKey: "checklist_validity_days",
          settingValue: String(Math.floor(n)),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Checklist validity saved", {
        description: `Completed checklists will remain valid for ${Math.floor(n)} days.`,
      });
      fetchValue();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <ListChecks className="size-4 text-teal-600" />
          </div>
          <div>
            <CardTitle className="text-base">Completed Checklist Validity</CardTitle>
            <CardDescription>
              Global setting — how long a completed skills checklist stays valid before the candidate
              must complete it again. Applies to all users across all organizations.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="checklist-validity-overview">Validity Window (days)</Label>
              <Input
                id="checklist-validity-overview"
                type="number"
                min="1"
                max="3650"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="365"
              />
              <p className="text-xs text-muted-foreground">
                Once a candidate submits a checklist, the response is valid for this many days. When a
                recruiter requests the same checklist while a valid response exists, the candidate can
                simply share the existing one instead of re-completing it.
              </p>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
