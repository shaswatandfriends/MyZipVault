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
  Bell,
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

// ─── Skeleton ───────────────────────────────────────────────────────
function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-24" />
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

  // Fix #14 - Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const stats = data?.usersByRole;

  // Credit bar chart data
  const maxCredits = Math.max(
    data?.creditsPurchasedMonth ?? 0,
    data?.creditsSpentMonth ?? 0,
    1
  );

  // Fix #8 - Approve/Reject handlers
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

  // Fix #17 - CSV Export
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
      ["Credits Purchased This Month", String(data.creditsPurchasedMonth ?? 0)],
      ["Credits Spent This Month", String(data.creditsSpentMonth ?? 0)],
      ["Credits Purchased Today", String(data.creditsPurchasedToday ?? 0)],
      ["Credits Spent Today", String(data.creditsSpentToday ?? 0)],
      ["Pending Admin Approvals", String(data.pendingAdminApprovals ?? 0)],
      ["Active Errors Today", String(data.errorCountToday ?? 0)],
      ["Active Announcements", String(data.activeAnnouncements ?? 0)],
    ];
    // Add user growth data
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

  return (
    <div className="space-y-3">
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
              Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Announcement Carousel ── */}
      <BannerCarousel />

      {/* ── Onboarding Empty State (Fix #18) ── */}
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
                  <ShieldCheck className="size-4 mr-1.5" />
                  Companies
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            {/* Total Users — clickable → /superadmin/users */}
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group/card"
              onClick={() => router.push("/superadmin/users")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Users className="size-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground group-hover/card:text-teal-700 transition-colors">
                  {stats?.candidates ?? 0} candidates, {stats?.clientRecruiters ?? 0} recruiters
                </p>
              </CardContent>
            </Card>

            {/* Credits Purchased This Month — clickable → /superadmin/analytics */}
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group/card"
              onClick={() => router.push("/superadmin/analytics")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Credits Purchased</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.creditsPurchasedMonth ?? 0}</div>
                <p className="text-xs text-muted-foreground group-hover/card:text-emerald-700 transition-colors">This month&apos;s total</p>
              </CardContent>
            </Card>

            {/* Credits Purchased Today — clickable → /superadmin/analytics */}
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group/card"
              onClick={() => router.push("/superadmin/analytics")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Credits Today</CardTitle>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <CreditCard className="size-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.creditsPurchasedToday ?? 0}</div>
                <p className="text-xs text-muted-foreground group-hover/card:text-teal-700 transition-colors">
                  Spent: {data?.creditsSpentToday ?? 0}
                </p>
              </CardContent>
            </Card>

            {/* Active Errors — clickable → /superadmin/errors */}
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group/card"
              onClick={() => router.push("/superadmin/errors")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
                <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="size-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.errorCountToday ?? 0}</div>
                <p className="text-xs text-muted-foreground group-hover/card:text-red-700 transition-colors">Errors logged today</p>
              </CardContent>
            </Card>

            {/* Pending Admin Approvals — clickable → /superadmin/admins */}
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group/card"
              onClick={() => router.push("/superadmin/admins")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <ShieldCheck className="size-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.pendingAdminApprovals ?? 0}</div>
                <p className="text-xs text-muted-foreground group-hover/card:text-amber-700 transition-colors">Admin accounts awaiting review</p>
              </CardContent>
            </Card>

            {/* Active Announcements — clickable → /superadmin/announcements */}
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group/card"
              onClick={() => router.push("/superadmin/announcements")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                <div className="size-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Megaphone className="size-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.activeAnnouncements ?? 0}</div>
                <p className="text-xs text-muted-foreground group-hover/card:text-purple-700 transition-colors">Currently active</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── User Growth Chart (Fix #16) ──────────────────────────────── */}
      {!isLoading && data?.userGrowth && data.userGrowth.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">User Growth</CardTitle>
                <CardDescription>New signups over the last 6 months</CardDescription>
              </div>
              <BarChart3 className="size-4 text-muted-foreground" />
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
                  <Bar dataKey="candidates" name="Candidates" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recruiters" name="Recruiters" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Revenue Snapshot & Announcements ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Credits Purchased vs Spent — clickable → /superadmin/analytics ──── */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer group/card"
          onClick={() => router.push("/superadmin/analytics")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Revenue Snapshot</CardTitle>
              <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
                This Month
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Credits Purchased</span>
                    <span className="text-emerald-700 font-semibold">
                      {data?.creditsPurchasedMonth ?? 0}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: `${((data?.creditsPurchasedMonth ?? 0) / maxCredits) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Credits Spent</span>
                    <span className="text-teal-700 font-semibold">
                      {data?.creditsSpentMonth ?? 0}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all duration-500"
                      style={{
                        width: `${((data?.creditsSpentMonth ?? 0) / maxCredits) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    Purchased
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-teal-500" />
                    Spent
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Pending Admin Approvals (Fix #8 - inline approve/reject) ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Admin Approvals</CardTitle>
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldCheck className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No pending approvals</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border space-y-0">
                {(data?.pendingAdminList ?? []).map((admin) => {
                  const fullName =
                    [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email;
                  return (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0">
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
                          variant="outline"
                          className="h-7 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
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

      {/* ── Error Log & Recent Signups ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Error Log Feed ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Errors</CardTitle>
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No recent errors</p>
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

        {/* ── Recent Signups (Fix #9 - clickable) ────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Signups</CardTitle>
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserPlus className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No recent signups</p>
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
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
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

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isLoading ? "…" : data?.activeAnnouncements ?? 0} active announcements
              </span>
              <span className="text-muted-foreground">·</span>
              <Building2 className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isLoading ? "…" : data?.organizationsCount ?? 0} organizations
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/users">
                <Users className="size-5 text-teal-600" />
                <span className="text-sm">Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/companies">
                <Building2 className="size-5 text-emerald-600" />
                <span className="text-sm">Companies</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/admins">
                <ShieldCheck className="size-5 text-teal-600" />
                <span className="text-sm">Admin Team</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/announcements">
                <Megaphone className="size-5 text-purple-600" />
                <span className="text-sm">Announcements</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/settings">
                <Settings className="size-5 text-muted-foreground" />
                <span className="text-sm">Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
