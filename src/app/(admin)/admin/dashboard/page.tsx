"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  FileText,
  UserPlus,
  ArrowUpRight,
  ShieldCheck,
  Bell,
  PenSquare,
  Download,
  BarChart3,
  Sparkles,
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
import { SpatialStatCard, SpatialAvatar } from "@/components/dashboard/spatial-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ──────────────────────────────────────────────────────────
interface DashboardData {
  usersByRole: {
    candidates: number;
    clientRecruiters: number;
    clientAdmins: number;
    platformAdmins: number;
    total: number;
  };
  pendingDocuments: number;
  recentSignups: number;
  documentQueueSize: number;
  recentSignupList: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    createdAt: string;
  }[];
  pendingVerificationPreview: {
    id: number;
    documentName: string;
    uploadedAt: string;
    candidate: {
      id: number;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }[];
  pendingReminders: number;
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
    case "super_admin":
      return <Badge variant="destructive">Admin</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

// ─── Skeleton Loaders ───────────────────────────────────────────────
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

function TableRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/dashboard");
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
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fix #14 - Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const stats = data?.usersByRole;

  // Fix #17 - CSV Export
  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Candidates", String(stats?.candidates ?? 0)],
      ["Total Recruiters", String(stats?.clientRecruiters ?? 0)],
      ["Client Admins", String(stats?.clientAdmins ?? 0)],
      ["Platform Admins", String(stats?.platformAdmins ?? 0)],
      ["Total Users", String(stats?.total ?? 0)],
      ["Pending Documents", String(data.pendingDocuments ?? 0)],
      ["Recent Signups (7 days)", String(data.recentSignups ?? 0)],
      ["Pending Reminders", String(data.pendingReminders ?? 0)],
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
    a.download = `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Dashboard"
        description="Platform administration overview. Monitor users, documents, and system health."
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !data}>
            <Download className="size-4 mr-1.5" />
            Export CSV
          </Button>
        }
      />

      {/* ── Announcement Carousel ── */}
      <BannerCarousel />

      {/* ── Onboarding Empty State (Fix #18) — spatial empty state ── */}
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
              Your platform is brand new. Start by inviting recruiters and candidates to begin building your community.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button asChild>
                <Link href="/admin/users">
                  <Users className="size-4 mr-1.5" />
                  Manage Users
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/content">
                  <PenSquare className="size-4 mr-1.5" />
                  Edit Content
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Cards — Spatial UI ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <SpatialStatCard
              title="Total Candidates"
              value={stats?.candidates ?? 0}
              subtitle="Registered candidates"
              icon={Users}
              iconVariant="primary"
            />
            <SpatialStatCard
              title="Total Recruiters"
              value={(stats?.clientRecruiters ?? 0) + (stats?.clientAdmins ?? 0)}
              subtitle={`${stats?.clientRecruiters ?? 0} recruiters, ${stats?.clientAdmins ?? 0} admins`}
              icon={ShieldCheck}
              iconVariant="terra"
            />
            <SpatialStatCard
              title="Pending Verifications"
              value={data?.pendingDocuments ?? 0}
              subtitle="Documents awaiting review"
              icon={FileText}
              iconVariant="amber"
            />
            <SpatialStatCard
              title="New Signups This Week"
              value={data?.recentSignups ?? 0}
              subtitle="New users in last 7 days"
              icon={UserPlus}
              iconVariant="primary"
            />
          </>
        )}
      </div>

      {/* ── User Growth Chart ──────────────────────────────────────── */}
      {!isLoading && data?.userGrowth && data.userGrowth.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading">User Growth</CardTitle>
                <CardDescription>New signups over the last 6 months</CardDescription>
              </div>
              <BarChart3 className="size-4" style={{ color: "var(--text-muted)" }} />
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
      )}

      {/* ── Two Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Document Verification Queue Preview ────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading">Document Verification Queue</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/documents">
                  <ArrowUpRight className="size-3.5" />
                  Review All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </div>
            ) : data?.pendingVerificationPreview.length === 0 ? (
              <div className="empty-state">
                <FileText className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pending documents</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {data?.pendingVerificationPreview.map((doc, idx) => {
                  const candidateName =
                    [doc.candidate.firstName, doc.candidate.lastName]
                      .filter(Boolean)
                      .join(" ") || doc.candidate.email;
                  const avatarInitial = doc.candidate.firstName?.[0]?.toUpperCase() ?? "D";
                  const avatarVariant = (idx % 2 === 0 ? "primary" : "terra") as "primary" | "terra";
                  return (
                    <div
                      key={doc.id}
                      className="spatial-list-item"
                    >
                      <SpatialAvatar initials={avatarInitial} variant={avatarVariant} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {doc.documentName}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {candidateName} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="shrink-0 ml-2">
                        <Link href="/admin/documents">
                          Review
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Recent User Signups — spatial list items ────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading">Recent Signups</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users">
                  <ArrowUpRight className="size-3.5" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </div>
            ) : data?.recentSignupList.length === 0 ? (
              <div className="empty-state">
                <Users className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No recent signups</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {data?.recentSignupList.map((user, idx) => {
                  const fullName =
                    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    user.email;
                  const avatarInitial = user.firstName?.[0]?.toUpperCase() ??
                    user.email[0]?.toUpperCase() ?? "U";
                  const avatarVariant = (idx % 2 === 0 ? "primary" : "terra") as "primary" | "terra";
                  return (
                    <Link
                      key={user.id}
                      href="/admin/users"
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

      {/* ── Quick Actions — spatial icon containers ──────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/users">
                <Users className="size-5" style={{ color: "var(--primary)" }} />
                <span className="text-sm">Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/documents">
                <FileText className="size-5" style={{ color: "var(--terra)" }} />
                <span className="text-sm">Verify Documents</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/content">
                <PenSquare className="size-5" style={{ color: "var(--primary)" }} />
                <span className="text-sm">Edit Content</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/reminders">
                <Bell className="size-5" style={{ color: "var(--terra)" }} />
                <span className="text-sm">Approve Reminders</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
