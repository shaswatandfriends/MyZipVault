"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  FileText,
  Clock,
  UserPlus,
  ArrowUpRight,
  ShieldCheck,
  Bell,
  PenSquare,
  LayoutDashboard,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    case "super_admin":
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100">
          Admin
        </Badge>
      );
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

  const stats = data?.usersByRole;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platform administration overview. Monitor users, documents, and system health."
      />

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
                <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Users className="size-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.candidates ?? 0}</div>
                <p className="text-xs text-muted-foreground">Registered candidates</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Recruiters</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ShieldCheck className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats?.clientRecruiters ?? 0) + (stats?.clientAdmins ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.clientRecruiters ?? 0} recruiters, {stats?.clientAdmins ?? 0} admins
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileText className="size-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.pendingDocuments ?? 0}</div>
                <p className="text-xs text-muted-foreground">Documents awaiting review</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">New Signups This Week</CardTitle>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <UserPlus className="size-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.recentSignups ?? 0}</div>
                <p className="text-xs text-muted-foreground">New users in last 7 days</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Two Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Document Verification Queue Preview ────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Document Verification Queue</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No pending documents</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {data?.pendingVerificationPreview.map((doc) => {
                  const candidateName =
                    [doc.candidate.firstName, doc.candidate.lastName]
                      .filter(Boolean)
                      .join(" ") || doc.candidate.email;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0">
                          {doc.candidate.firstName?.[0]?.toUpperCase() ?? "D"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {doc.documentName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidateName} · {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
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

        {/* ── Recent User Signups ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Signups</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No recent signups</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {data?.recentSignupList.map((user) => {
                  const fullName =
                    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    user.email;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                          {user.firstName?.[0]?.toUpperCase() ??
                            user.email[0]?.toUpperCase()}
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

      {/* ── Quick Links ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/users">
                <Users className="size-5 text-teal-600" />
                <span className="text-sm">Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/documents">
                <FileText className="size-5 text-emerald-600" />
                <span className="text-sm">Verify Documents</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/content">
                <PenSquare className="size-5 text-teal-600" />
                <span className="text-sm">Edit Content</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/reminders">
                <Bell className="size-5 text-emerald-600" />
                <span className="text-sm">Approve Reminders</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
