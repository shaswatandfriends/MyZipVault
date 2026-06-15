"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Megaphone,
  UserPlus,
  CheckCircle2,
  XCircle,
  Download,
  BarChart3,
  Sparkles,
  Building2,
  Settings,
  Activity,
  TrendingUp,
  Clock,
} from "@/lib/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { PageHeader } from "@/components/layout/page-header";
import { BannerCarousel } from "@/components/banners/banner-carousel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
interface DashboardData {
  usersByRole: {
    candidates: number;
    clientRecruiters: number;
    clientAdmins: number;
    platformAdmins: number;
    superAdmins: number;
    total: number;
  };
  revenueThisMonth: number;
  creditsPurchasedToday: number;
  creditsSpentToday: number;
  creditsPurchasedMonth: number;
  creditsSpentMonth: number;
  pendingAdminApprovals: number;
  errorCountToday: number;
  activeAnnouncements: number;
  organizationsCount: number;
  recentErrors: {
    id: number;
    severity: string;
    service: string;
    errorMessage: string;
    createdAt: string;
  }[];
  recentSignups: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    createdAt: string;
  }[];
  pendingAdminList: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    createdAt: string;
  }[];
  userGrowth: {
    month: string;
    candidates: number;
    recruiters: number;
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRoleBadge(role: string) {
  switch (role) {
    case "candidate":
      return (
        <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
          Candidate
        </Badge>
      );
    case "client_recruiter":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          Recruiter
        </Badge>
      );
    case "client_admin":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Client Admin
        </Badge>
      );
    case "platform_admin":
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100">
          Admin
        </Badge>
      );
    case "super_admin":
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
          Super Admin
        </Badge>
      );
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Critical</Badge>;
    case "error":
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">Error</Badge>;
    case "warning":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Warning</Badge>;
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
}

// ─── Skeletons ───────────────────────────────────────────────────────
function HeroCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-10 w-20 mb-2" />
        <Skeleton className="h-3 w-48" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>("all");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/superadmin/dashboard?period=${period}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch dashboard data");
      }
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load dashboard", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const stats = data?.usersByRole;

  // Approve/Reject handlers
  const handleApprove = async (adminId: number) => {
    setProcessingId(adminId);
    try {
      const res = await fetch(`/api/superadmin/admins/${adminId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve");
      toast.success("Admin approved successfully");
      fetchDashboard();
    } catch {
      toast.error("Failed to approve admin");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (adminId: number) => {
    setProcessingId(adminId);
    try {
      const res = await fetch(`/api/superadmin/admins/${adminId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Admin rejected");
      fetchDashboard();
    } catch {
      toast.error("Failed to reject admin");
    } finally {
      setProcessingId(null);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", String(stats?.total ?? 0)],
      ["Candidates", String(stats?.candidates ?? 0)],
      ["Client Recruiters", String(stats?.clientRecruiters ?? 0)],
      ["Client Admins", String(stats?.clientAdmins ?? 0)],
      ["Platform Admins", String(stats?.platformAdmins ?? 0)],
      ["Super Admins", String(stats?.superAdmins ?? 0)],
      ["Organizations", String(data.organizationsCount ?? 0)],
      ["Credits Purchased This Month", String(data.creditsPurchasedMonth ?? 0)],
      ["Credits Spent This Month", String(data.creditsSpentMonth ?? 0)],
      ["Credits Purchased Today", String(data.creditsPurchasedToday ?? 0)],
      ["Credits Spent Today", String(data.creditsSpentToday ?? 0)],
      ["Pending Admin Approvals", String(data.pendingAdminApprovals ?? 0)],
      ["Active Errors Today", String(data.errorCountToday ?? 0)],
      ["Active Announcements", String(data.activeAnnouncements ?? 0)],
    ];
    if (data.userGrowth?.length) {
      rows.push([]);
      rows.push(["Month", "Candidates", "Recruiters"]);
      for (const row of data.userGrowth) {
        rows.push([row.month, String(row.candidates), String(row.recruiters)]);
      }
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `superadmin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  // Determine platform health status
  const hasErrors = (data?.errorCountToday ?? 0) > 0;
  const hasPending = (data?.pendingAdminApprovals ?? 0) > 0;
  const healthStatus = hasErrors ? "critical" : hasPending ? "warning" : "healthy";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Dashboard"
        description="System-wide overview. Monitor all organizations, users, and platform health."
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !data}>
              <Download className="size-4 mr-1.5" />
              Export
            </Button>
          </div>
        }
      />

      {/* ── Announcement Carousel ── */}
      <BannerCarousel />

      {/* ── Onboarding Empty State ── */}
      {!isLoading && data && data.usersByRole.total === 0 && (
        <Card className="border-dashed border-2 border-teal-200 bg-teal-50/50">
          <CardContent className="py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="size-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Sparkles className="size-6 text-teal-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-teal-900 mb-1">Welcome to Your Platform!</h3>
            <p className="text-sm text-teal-700 max-w-md mx-auto mb-4">
              Your platform is brand new. Start by setting up organizations and inviting admins to begin managing the system.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild>
                <Link href="/superadmin/users">
                  <Users className="size-4 mr-1.5" />
                  Manage Users
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/superadmin/companies">
                  <Building2 className="size-4 mr-1.5" />
                  Companies
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HERO METRIC CARDS — 3 prominent cards with gradient backgrounds
          Consolidates: stats cards + revenue snapshot + removes redundancy
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <HeroCardSkeleton />
            <HeroCardSkeleton />
            <HeroCardSkeleton />
          </>
        ) : (
          <>
            {/* ── Card 1: Users & Organizations ─────────────────────── */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all group/card border-0 bg-gradient-to-br from-teal-600 to-teal-700 text-white"
              onClick={() => router.push("/superadmin/users")}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Users className="size-5 text-white" />
                  </div>
                  <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                </div>
                <div className="text-3xl font-bold tracking-tight">{stats?.total ?? 0}</div>
                <p className="text-sm text-teal-100 font-medium mt-0.5">Total Users</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-[11px] px-2">
                    {stats?.candidates ?? 0} Candidates
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-[11px] px-2">
                    {stats?.clientRecruiters ?? 0} Recruiters
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-[11px] px-2">
                    {stats?.clientAdmins ?? 0} Admins
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-[11px] px-2">
                    {data?.organizationsCount ?? 0} Orgs
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* ── Card 2: Credits & Revenue ────────────────────────── */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all group/card border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white"
              onClick={() => router.push("/superadmin/analytics")}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <TrendingUp className="size-5 text-white" />
                  </div>
                  <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                </div>
                <div className="text-3xl font-bold tracking-tight">{data?.creditsPurchasedMonth ?? 0}</div>
                <p className="text-sm text-emerald-100 font-medium mt-0.5">Credits Purchased (Month)</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-100 flex items-center gap-1.5">
                      <CreditCard className="size-3.5" /> Spent This Month
                    </span>
                    <span className="font-semibold">{data?.creditsSpentMonth ?? 0}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/70 transition-all duration-500"
                      style={{
                        width: `${Math.min(((data?.creditsSpentMonth ?? 0) / Math.max(data?.creditsPurchasedMonth ?? 1, 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span>Today: {data?.creditsPurchasedToday ?? 0} purchased / {data?.creditsSpentToday ?? 0} spent</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Card 3: Platform Health ──────────────────────────── */}
            <Card
              className={`cursor-pointer hover:shadow-lg transition-all group/card border-0 text-white ${
                healthStatus === "critical"
                  ? "bg-gradient-to-br from-red-600 to-red-700"
                  : healthStatus === "warning"
                  ? "bg-gradient-to-br from-amber-500 to-amber-600"
                  : "bg-gradient-to-br from-violet-600 to-violet-700"
              }`}
              onClick={() => {
                if (hasErrors) router.push("/superadmin/errors");
                else if (hasPending) router.push("/superadmin/admins");
                else router.push("/superadmin/compliance");
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Activity className="size-5 text-white" />
                  </div>
                  <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                </div>
                <div className="text-3xl font-bold tracking-tight capitalize">{healthStatus === "healthy" ? "Healthy" : healthStatus === "warning" ? "Attention" : "Critical"}</div>
                <p className="text-sm font-medium mt-0.5 opacity-90">Platform Status</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge className={`border-0 text-[11px] px-2 ${data?.errorCountToday ? "bg-white/30 text-white" : "bg-white/15 text-white/80"}`}>
                    <AlertTriangle className="size-3 mr-1" />
                    {data?.errorCountToday ?? 0} Errors
                  </Badge>
                  <Badge className={`border-0 text-[11px] px-2 ${data?.pendingAdminApprovals ? "bg-white/30 text-white" : "bg-white/15 text-white/80"}`}>
                    <ShieldCheck className="size-3 mr-1" />
                    {data?.pendingAdminApprovals ?? 0} Pending
                  </Badge>
                  <Badge className="bg-white/15 text-white/80 border-0 text-[11px] px-2">
                    <Megaphone className="size-3 mr-1" />
                    {data?.activeAnnouncements ?? 0} Announcements
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          USER GROWTH CHART + PENDING APPROVALS — Two-column layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── User Growth Chart ────────────────────────────────────── */}
        {isLoading ? (
          <ChartSkeleton />
        ) : data?.userGrowth && data.userGrowth.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">User Growth</CardTitle>
                  <CardDescription>New signups over the last 6 months</CardDescription>
                </div>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <BarChart3 className="size-4 text-teal-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.userGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="candidates" name="Candidates" fill="var(--accent-teal)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recruiters" name="Recruiters" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">User Growth</CardTitle>
                  <CardDescription>New signups over the last 6 months</CardDescription>
                </div>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <BarChart3 className="size-4 text-teal-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <BarChart3 className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Not enough data to show growth chart</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Pending Admin Approvals ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Pending Admin Approvals</CardTitle>
                <CardDescription>
                  {(data?.pendingAdminList ?? []).length > 0
                    ? `${data?.pendingAdminList.length} awaiting your review`
                    : "All clear"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
                <Link href="/superadmin/admins">
                  <ArrowUpRight className="size-3.5" />
                  Manage
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton />
            ) : (data?.pendingAdminList ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="size-7 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No pending approvals</p>
                <p className="text-xs text-muted-foreground mt-1">All admin accounts have been reviewed</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border space-y-0">
                {(data?.pendingAdminList ?? []).map((admin) => {
                  const fullName =
                    [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email;
                  return (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0">
                          {admin.firstName?.[0]?.toUpperCase() ?? "A"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {admin.email} · {formatDate(admin.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApprove(admin.id)}
                          disabled={processingId === admin.id}
                        >
                          <CheckCircle2 className="size-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => handleReject(admin.id)}
                          disabled={processingId === admin.id}
                        >
                          <XCircle className="size-3" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RECENT ERRORS + RECENT SIGNUPS — Two-column layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Error Log Feed ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Errors</CardTitle>
                <CardDescription>
                  {(data?.errorCountToday ?? 0) > 0
                    ? `${data?.errorCountToday} error${(data?.errorCountToday ?? 0) !== 1 ? "s" : ""} logged today`
                    : "No errors today"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
                <Link href="/superadmin/errors">
                  <ArrowUpRight className="size-3.5" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton />
            ) : (data?.recentErrors ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="size-7 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No recent errors</p>
                <p className="text-xs text-muted-foreground mt-1">System is running smoothly</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.recentErrors ?? []).map((err) => (
                      <TableRow
                        key={err.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push("/superadmin/errors")}
                      >
                        <TableCell>{getSeverityBadge(err.severity)}</TableCell>
                        <TableCell className="text-sm font-medium">{err.service}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {err.errorMessage}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(err.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Recent Signups ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Signups</CardTitle>
                <CardDescription>Latest users who joined the platform</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
                <Link href="/superadmin/users">
                  <ArrowUpRight className="size-3.5" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton />
            ) : (data?.recentSignups ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-14 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                  <UserPlus className="size-7 text-teal-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No recent signups</p>
                <p className="text-xs text-muted-foreground mt-1">New users will appear here</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border space-y-0">
                {(data?.recentSignups ?? []).map((user) => {
                  const fullName =
                    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
                  return (
                    <Link
                      key={user.id}
                      href="/superadmin/users"
                      className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                          {user.firstName?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email} · {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                      {getRoleBadge(user.role)}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          QUICK ACTIONS — Clean, contextual grid
      ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Jump to common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-teal-300 hover:bg-teal-50/50">
              <Link href="/superadmin/users">
                <Users className="size-5 text-teal-600" />
                <span className="text-xs">Users</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-emerald-300 hover:bg-emerald-50/50">
              <Link href="/superadmin/companies">
                <Building2 className="size-5 text-emerald-600" />
                <span className="text-xs">Companies</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-amber-300 hover:bg-amber-50/50">
              <Link href="/superadmin/admins">
                <ShieldCheck className="size-5 text-amber-600" />
                <span className="text-xs">Admin Team</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-purple-300 hover:bg-purple-50/50">
              <Link href="/superadmin/announcements">
                <Megaphone className="size-5 text-purple-600" />
                <span className="text-xs">Announcements</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-blue-300 hover:bg-blue-50/50">
              <Link href="/superadmin/analytics">
                <BarChart3 className="size-5 text-blue-600" />
                <span className="text-xs">Analytics</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 hover:border-gray-300 hover:bg-gray-50/50">
              <Link href="/superadmin/settings">
                <Settings className="size-5 text-gray-600" />
                <span className="text-xs">Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
