"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Megaphone,
  UserPlus,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { BannerCarousel } from "@/components/banners/banner-carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/dashboard");
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

  const stats = data?.usersByRole;

  // Credit bar chart data
  const maxCredits = Math.max(
    data?.creditsPurchasedMonth ?? 0,
    data?.creditsSpentMonth ?? 0,
    1
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title="Dashboard"
        description="System-wide overview. Monitor all organizations, users, and platform health."
      />

      {/* ── Announcement Carousel ── */}
      <BannerCarousel />

      {/* ── Stats Cards ────────────────────────────────────────────── */}
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
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Users className="size-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.candidates ?? 0} candidates, {stats?.clientRecruiters ?? 0} recruiters
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.revenueThisMonth ?? 0}</div>
                <p className="text-xs text-muted-foreground">Credits purchased</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Credits Purchased Today</CardTitle>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <CreditCard className="size-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.creditsPurchasedToday ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Spent: {data?.creditsSpentToday ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
                <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="size-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.errorCountToday ?? 0}</div>
                <p className="text-xs text-muted-foreground">Errors logged today</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Revenue Snapshot & Announcements ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Credits Purchased vs Spent ──────────────────────────── */}
        <Card>
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

        {/* ── Pending Admin Approvals ──────────────────────────────── */}
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
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 shrink-0 ml-2">
                        Pending
                      </Badge>
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
                      <TableRow key={err.id}>
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
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
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
                    </div>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/users">
                <Users className="size-5 text-teal-600" />
                <span className="text-sm">Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/superadmin/companies">
                <DollarSign className="size-5 text-emerald-600" />
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
              <Link href="/superadmin/settings">
                <CreditCard className="size-5 text-emerald-600" />
                <span className="text-sm">Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
