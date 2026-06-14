"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  Clock,
  CheckCircle2,
  CreditCard,
  Send,
  Search,
  FileText,
  AlertCircle,
  ArrowUpRight,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { BannerCarousel } from "@/components/banners/banner-carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────
interface SharedDocument {
  id: number;
  type: string;
  name: string;
  isUnlocked: boolean;
  sharedAt: string;
}

interface Candidate {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  specialty: string;
  complianceStatus: "compliant" | "pending" | "non_compliant";
  lastActivity: string | null;
  sharedDocuments: SharedDocument[];
  checklistRequestCount: number;
  latestRequestStatus: string | null;
  latestRequestDate: string | null;
}

interface DashboardStats {
  totalCandidates: number;
  pendingRequests: number;
  completedPackets: number;
  creditsUsedThisMonth: number;
  creditsBalance: number;
  baaStatus: string;
}

interface DashboardData {
  candidates: Candidate[];
  stats: DashboardStats;
  organization: {
    name: string;
    creditsBalance: number;
  };
}

type ComplianceFilter = "all" | "compliant" | "pending" | "non_compliant";

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getComplianceBadge(status: Candidate["complianceStatus"]) {
  switch (status) {
    case "compliant":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          <CheckCircle2 className="size-3" />
          Compliant
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <Clock className="size-3" />
          Pending
        </Badge>
      );
    case "non_compliant":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          <AlertCircle className="size-3" />
          Non-Compliant
        </Badge>
      );
  }
}

function getComplianceDot(status: Candidate["complianceStatus"]) {
  switch (status) {
    case "compliant":
      return <span className="inline-block size-2 rounded-full bg-emerald-500" />;
    case "pending":
      return <span className="inline-block size-2 rounded-full bg-amber-500" />;
    case "non_compliant":
      return <span className="inline-block size-2 rounded-full bg-red-500" />;
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
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function RecruiterDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/recruiter/dashboard");
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

  const filteredCandidates = useMemo(() => {
    if (!data?.candidates) return [];
    return data.candidates.filter((c) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        `${c.firstName ?? ""} ${c.lastName ?? ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCompliance =
        complianceFilter === "all" || c.complianceStatus === complianceFilter;

      return matchesSearch && matchesCompliance;
    });
  }, [data?.candidates, searchQuery, complianceFilter]);

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* ── Header with credit balance ─────────────────────────────── */}
      <PageHeader
        title="Dashboard"
        description="Manage your candidate verification requests and track your organization's activity."
        actions={
          <div className="flex items-center gap-3">
            {/* Credit Balance Badge — always visible */}
            <Card className="shadow-none border-dashed py-0">
              <CardContent className="flex items-center gap-2 px-3 py-2">
                <CreditCard className="size-4 text-emerald-600" />
                <span className="text-sm font-medium text-muted-foreground">
                  Credits
                </span>
                <Badge className="bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-600 text-sm px-2">
                  {isLoading ? "…" : stats?.creditsBalance ?? 0}
                </Badge>
              </CardContent>
            </Card>

            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/recruiter/send">
                <Send className="size-4" />
                Send New Request
              </Link>
            </Button>
          </div>
        }
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
                <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Users className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCandidates ?? 0}</div>
                <p className="text-xs text-muted-foreground">Candidates in pipeline</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="size-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingRequests ?? 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting candidate response</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completed Packets</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.completedPackets ?? 0}</div>
                <p className="text-xs text-muted-foreground">Fully verified checklists</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Credits Used This Month</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.creditsUsedThisMonth ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {stats?.creditsBalance ?? 0} remaining
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Filter Bar + Candidate Table ───────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Candidates</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-56"
                />
              </div>

              {/* Compliance filter */}
              <Select
                value={complianceFilter}
                onValueChange={(val) => setComplianceFilter(val as ComplianceFilter)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="compliant">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Compliant
                    </span>
                  </SelectItem>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Pending
                    </span>
                  </SelectItem>
                  <SelectItem value="non_compliant">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-red-500" />
                      Non-Compliant
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            /* ── Loading skeleton table ───────────────────────────── */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Checklist Status</TableHead>
                  <TableHead>Docs Shared</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : filteredCandidates.length === 0 ? (
            /* ── Empty state ──────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No candidates yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Send your first request to get started.
              </p>
              <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/recruiter/send">
                  <Send className="size-4" />
                  Send New Request
                </Link>
              </Button>
            </div>
          ) : (
            /* ── Candidate table ─────────────────────────────────── */
            <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Checklist Status</TableHead>
                    <TableHead>Docs Shared</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => {
                    const fullName =
                      [candidate.firstName, candidate.lastName]
                        .filter(Boolean)
                        .join(" ") || candidate.email;

                    return (
                      <TableRow key={candidate.id} className="group">
                        {/* Candidate Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0">
                              {candidate.firstName?.[0]?.toUpperCase() ??
                                candidate.email[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {fullName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {candidate.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Specialty */}
                        <TableCell>
                          <span className="text-sm">{candidate.specialty || "—"}</span>
                        </TableCell>

                        {/* Checklist Status */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getComplianceDot(candidate.complianceStatus)}
                            {getComplianceBadge(candidate.complianceStatus)}
                          </div>
                        </TableCell>

                        {/* Documents Shared */}
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm">
                            <FileText className="size-3.5 text-muted-foreground" />
                            {candidate.sharedDocuments.length}
                          </span>
                        </TableCell>

                        {/* Last Activity */}
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(candidate.lastActivity)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── Table footer info ──────────────────────────────────── */}
          {!isLoading && filteredCandidates.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredCandidates.length} of {data?.candidates.length ?? 0}{" "}
                candidate{(data?.candidates.length ?? 0) !== 1 ? "s" : ""}
              </p>
              <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
                <Link href="/recruiter/send">
                  <ArrowUpRight className="size-3.5" />
                  View All Requests
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
