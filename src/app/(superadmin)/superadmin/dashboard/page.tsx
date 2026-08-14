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
import { SpatialAvatar } from "@/components/dashboard/spatial-stat-card";
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
  creditsSoldThisMonth: number;
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
      return <Badge variant="info">Candidate</Badge>;
    case "client_recruiter":
      return <Badge variant="secondary">Recruiter</Badge>;
    case "client_admin":
      return <Badge variant="warning">Client Admin</Badge>;
    case "platform_admin":
      return <Badge variant="destructive">Admin</Badge>;
    case "super_admin":
      return <Badge variant="terra">Super Admin</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "warning":
      return <Badge variant="warning">Warning</Badge>;
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

      {/* ── Onboarding Empty State — spatial ── */}
      {!isLoading && data && data.usersByRole.total === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <div
                className="empty-state-icon"
                style={{
                  background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(45,90,61,0.32)",
                  color: "#fff",
                }}
              >
                <Sparkles className="size-7" />
              </div>
            </div>
            <h3 className="empty-state-title">Welcome to Your Platform!</h3>
            <p className="empty-state-description">
              Your platform is brand new. Start by setting up organizations and inviting admins to begin managing the system.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
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
          HERO METRIC CARDS — 3 spatial cards with dark gradient backgrounds
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
            {/* ── Card 1: Users & Organizations — forest green ─────────── */}
            <Card
              className="cursor-pointer transition-all group/card overflow-hidden"
              onClick={() => router.push("/superadmin/users")}
              style={{
                background: "linear-gradient(135deg, #2D5A3D 0%, #1E3A26 100%)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 16px 40px rgba(45,90,61,0.22), 0 4px 12px rgba(0,0,0,0.08)",
                color: "#fff",
              }}
            >
              <CardContent className="pt-6 relative">
                {/* Subtle orb */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: 200, height: 200, top: -80, right: -60, background: "radial-gradient(circle, rgba(74,124,89,0.5) 0%, rgba(74,124,89,0) 70%)", filter: "blur(40px)" }}
                />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex items-center justify-center size-10 rounded-[12px]"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                      }}
                    >
                      <Users className="size-5 text-white" />
                    </div>
                    <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                  </div>
                  <div className="text-3xl font-bold tracking-tight tabular-nums">{stats?.total ?? 0}</div>
                  <p className="text-sm font-medium mt-0.5 text-white/85">Total Users</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge className="bg-white/15 text-white border-0 hover:bg-white/15 text-[11px] px-2">
                      {stats?.candidates ?? 0} Candidates
                    </Badge>
                    <Badge className="bg-white/15 text-white border-0 hover:bg-white/15 text-[11px] px-2">
                      {stats?.clientRecruiters ?? 0} Recruiters
                    </Badge>
                    <Badge className="bg-white/15 text-white border-0 hover:bg-white/15 text-[11px] px-2">
                      {stats?.clientAdmins ?? 0} Admins
                    </Badge>
                    <Badge className="bg-white/15 text-white border-0 hover:bg-white/15 text-[11px] px-2">
                      {data?.organizationsCount ?? 0} Orgs
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Card 2: Credits & Revenue — terracotta ─────────────── */}
            <Card
              className="cursor-pointer transition-all group/card overflow-hidden"
              onClick={() => router.push("/superadmin/analytics")}
              style={{
                background: "linear-gradient(135deg, #C97B54 0%, #A0522D 100%)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 16px 40px rgba(201,123,84,0.22), 0 4px 12px rgba(0,0,0,0.08)",
                color: "#fff",
              }}
            >
              <CardContent className="pt-6 relative">
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: 200, height: 200, top: -80, right: -60, background: "radial-gradient(circle, rgba(232,168,130,0.4) 0%, rgba(232,168,130,0) 70%)", filter: "blur(40px)" }}
                />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex items-center justify-center size-10 rounded-[12px]"
                      style={{
                        background: "rgba(255,255,255,0.22)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                      }}
                    >
                      <TrendingUp className="size-5 text-white" />
                    </div>
                    <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                  </div>
                  <div className="text-3xl font-bold tracking-tight tabular-nums">${(data?.revenueThisMonth ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <p className="text-sm font-medium mt-0.5 text-white/85">Revenue This Month</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/85 flex items-center gap-1.5">
                        <CreditCard className="size-3.5" /> Credits Sold (Month)
                      </span>
                      <span className="font-semibold tabular-nums">{data?.creditsSoldThisMonth ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/85 flex items-center gap-1.5">
                        <TrendingUp className="size-3.5" /> Spent This Month
                      </span>
                      <span className="font-semibold tabular-nums">{data?.creditsSpentMonth ?? 0}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/80 transition-all duration-500"
                        style={{
                          width: `${Math.min(((data?.creditsSpentMonth ?? 0) / Math.max(data?.creditsPurchasedMonth ?? 1, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>Today: {data?.creditsPurchasedToday ?? 0} purchased / {data?.creditsSpentToday ?? 0} spent</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Card 3: Platform Health — adaptive color ─────────── */}
            <Card
              className="cursor-pointer transition-all group/card overflow-hidden"
              onClick={() => {
                if (hasErrors) router.push("/superadmin/errors");
                else if (hasPending) router.push("/superadmin/admins");
                else router.push("/superadmin/compliance");
              }}
              style={{
                background:
                  healthStatus === "critical"
                    ? "linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)"
                    : healthStatus === "warning"
                    ? "linear-gradient(135deg, #D97706 0%, #92400E 100%)"
                    : "linear-gradient(135deg, #4A7C59 0%, #2D5A3D 100%)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 16px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
                color: "#fff",
              }}
            >
              <CardContent className="pt-6 relative">
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: 200, height: 200, top: -80, right: -60, background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)", filter: "blur(40px)" }}
                />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex items-center justify-center size-10 rounded-[12px]"
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                      }}
                    >
                      <Activity className="size-5 text-white" />
                    </div>
                    <ArrowUpRight className="size-4 text-white/50 group-hover/card:text-white/90 transition-colors" />
                  </div>
                  <div className="text-3xl font-bold tracking-tight capitalize">
                    {healthStatus === "healthy" ? "Healthy" : healthStatus === "warning" ? "Attention" : "Critical"}
                  </div>
                  <p className="text-sm font-medium mt-0.5 text-white/85">Platform Status</p>
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
                  <CardTitle className="text-base font-heading">User Growth</CardTitle>
                  <CardDescription>New signups over the last 6 months</CardDescription>
                </div>
                <div
                  className="flex items-center justify-center size-8 rounded-[10px]"
                  style={{
                    background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
                    color: "#fff",
                  }}
                >
                  <BarChart3 className="size-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.userGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} style={{ fill: "var(--text-muted)" }} />
                    <YAxis tick={{ fontSize: 12 }} style={{ fill: "var(--text-muted)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,252,248,0.95)",
                        border: "0.5px solid var(--material-thick-border)",
                        borderRadius: "14px",
                        fontSize: "12px",
                        backdropFilter: "blur(44px) saturate(2) brightness(1.06)",
                        WebkitBackdropFilter: "blur(44px) saturate(2) brightness(1.06)",
                        boxShadow: "0 24px 64px rgba(45,90,61,0.18), 0 8px 24px rgba(0,0,0,0.06)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="candidates" name="Candidates" fill="#4A7C59" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="recruiters" name="Recruiters" fill="#C97B54" radius={[6, 6, 0, 0]} />
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
                  <CardTitle className="text-base font-heading">User Growth</CardTitle>
                  <CardDescription>New signups over the last 6 months</CardDescription>
                </div>
                <div
                  className="flex items-center justify-center size-8 rounded-[10px]"
                  style={{
                    background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
                    color: "#fff",
                  }}
                >
                  <BarChart3 className="size-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="empty-state">
                <BarChart3 className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Not enough data to show growth chart</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Pending Admin Approvals — spatial list items ────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading">Pending Admin Approvals</CardTitle>
                <CardDescription>
                  {(data?.pendingAdminList ?? []).length > 0
                    ? `${data?.pendingAdminList.length} awaiting your review`
                    : "All clear"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
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
              <div className="empty-state">
                <div
                  className="empty-state-icon"
                  style={{
                    background: "var(--primary-light)",
                    border: "0.5px solid var(--status-green-border)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                    color: "var(--primary)",
                  }}
                >
                  <CheckCircle2 className="size-7" />
                </div>
                <p className="empty-state-title">No pending approvals</p>
                <p className="empty-state-description">All admin accounts have been reviewed</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border space-y-0">
                {(data?.pendingAdminList ?? []).map((admin, idx) => {
                  const fullName =
                    [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email;
                  const avatarInitial = admin.firstName?.[0]?.toUpperCase() ?? "A";
                  const avatarVariant = (idx % 2 === 0 ? "primary" : "terra") as "primary" | "terra";
                  return (
                    <div key={admin.id} className="spatial-list-item">
                      <SpatialAvatar initials={avatarInitial} variant={avatarVariant} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{fullName}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {admin.email} · {formatDate(admin.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleApprove(admin.id)}
                          disabled={processingId === admin.id}
                        >
                          <CheckCircle2 className="size-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
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
                <CardTitle className="text-base font-heading">Recent Errors</CardTitle>
                <CardDescription>
                  {(data?.errorCountToday ?? 0) > 0
                    ? `${data?.errorCountToday} error${(data?.errorCountToday ?? 0) !== 1 ? "s" : ""} logged today`
                    : "No errors today"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
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
              <div className="empty-state">
                <div
                  className="empty-state-icon"
                  style={{
                    background: "var(--primary-light)",
                    border: "0.5px solid var(--status-green-border)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                    color: "var(--primary)",
                  }}
                >
                  <CheckCircle2 className="size-7" />
                </div>
                <p className="empty-state-title">No recent errors</p>
                <p className="empty-state-description">System is running smoothly</p>
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
                        className="cursor-pointer"
                        onClick={() => router.push("/superadmin/errors")}
                      >
                        <TableCell>{getSeverityBadge(err.severity)}</TableCell>
                        <TableCell className="text-sm font-medium">{err.service}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" style={{ color: "var(--text-secondary)" }}>
                          {err.errorMessage}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
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

        {/* ── Recent Signups — spatial list items ────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading">Recent Signups</CardTitle>
                <CardDescription>Latest users who joined the platform</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
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
              <div className="empty-state">
                <div
                  className="empty-state-icon"
                  style={{
                    background: "var(--primary-light)",
                    border: "0.5px solid var(--status-green-border)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                    color: "var(--primary)",
                  }}
                >
                  <UserPlus className="size-7" />
                </div>
                <p className="empty-state-title">No recent signups</p>
                <p className="empty-state-description">New users will appear here</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border space-y-0">
                {(data?.recentSignups ?? []).map((user, idx) => {
                  const fullName =
                    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
                  const avatarInitial = user.firstName?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase() ?? "U";
                  const avatarVariant = (idx % 2 === 0 ? "primary" : "terra") as "primary" | "terra";
                  return (
                    <Link
                      key={user.id}
                      href="/superadmin/users"
                      className="spatial-list-item"
                    >
                      <SpatialAvatar initials={avatarInitial} variant={avatarVariant} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{fullName}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {user.email} · {formatDate(user.createdAt)}
                        </p>
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
          QUICK ACTIONS — spatial icon containers
      ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Quick Actions</CardTitle>
          <CardDescription>Jump to common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/users">
                <Users className="size-5" style={{ color: "var(--primary)" }} />
                <span className="text-xs">Users</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/companies">
                <Building2 className="size-5" style={{ color: "var(--terra)" }} />
                <span className="text-xs">Companies</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/admins">
                <ShieldCheck className="size-5" style={{ color: "var(--primary)" }} />
                <span className="text-xs">Admin Team</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/announcements">
                <Megaphone className="size-5" style={{ color: "var(--terra)" }} />
                <span className="text-xs">Announcements</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/analytics">
                <BarChart3 className="size-5" style={{ color: "var(--primary)" }} />
                <span className="text-xs">Analytics</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/settings">
                <Settings className="size-5" style={{ color: "var(--terra)" }} />
                <span className="text-xs">Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
