"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Clock,
  CheckCircle2,
  Search,
  FileText,
  FileCheck,
  AlertCircle,
  ArrowUpRight,
  CreditCard,
  Download,
  Send,
  BellRing,
  Loader2,
} from "@/lib/icons";

import { BannerCarousel } from "@/components/banners/banner-carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpatialStatCard, SpatialAvatar } from "@/components/dashboard/spatial-stat-card";
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
        <Badge variant="success">
          <CheckCircle2 className="size-3" />
          Compliant
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="warning">
          <Clock className="size-3" />
          Pending
        </Badge>
      );
    case "non_compliant":
      return (
        <Badge variant="destructive">
          <AlertCircle className="size-3" />
          Non-Compliant
        </Badge>
      );
  }
}

function getComplianceDot(status: Candidate["complianceStatus"]) {
  switch (status) {
    case "compliant":
      return <span className="inline-block size-2 rounded-full" style={{ background: "var(--primary)" }} />;
    case "pending":
      return <span className="inline-block size-2 rounded-full" style={{ background: "var(--status-amber)" }} />;
    case "non_compliant":
      return <span className="inline-block size-2 rounded-full" style={{ background: "var(--status-red)" }} />;
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
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/recruiter/dashboard?period=${period}`);
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

  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);
  const router = useRouter();

  // Send in-app reminder to a candidate
  const handleSendReminder = async (candidateId: number) => {
    setSendingReminderId(candidateId);
    try {
      const res = await fetch("/api/recruiter/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send reminder");
      }
      toast.success("Reminder sent!", {
        description: "The candidate will see this in their notifications.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Could not send reminder", { description: message });
    } finally {
      setSendingReminderId(null);
    }
  };

  // CSV Export
  const handleExport = () => {
    if (!data?.candidates) return;
    const rows = [
      ["Name", "Email", "Specialty", "Compliance Status", "Docs Shared", "Last Activity"],
      ...filteredCandidates.map((c) => [
        `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
        c.email,
        c.specialty || "",
        c.complianceStatus,
        String(c.sharedDocuments.length),
        c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // BAA badge helper
  function getBaaBadge(status: string) {
    switch (status) {
      case "signed":
        return <Badge variant="success">Signed</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "not_signed":
        return <Badge variant="destructive">Not Signed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  const stats = data?.stats;

  return (
    <div className="space-y-3">
      {/* ── Announcement Carousel ── */}
      <BannerCarousel />

      {/* ── Period Selector ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide font-heading" style={{ color: "var(--text-secondary)" }}>Overview</h2>
        <Select value={period} onValueChange={(val) => setPeriod(val as "week" | "month" | "all")}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            {/* Total Candidates — clickable: scrolls to candidate table */}
            <SpatialStatCard
              title="Total Candidates"
              value={stats?.totalCandidates ?? 0}
              subtitle="Candidates in pipeline"
              icon={Users}
              iconVariant="primary"
              onClick={() => {
                const el = document.getElementById("candidate-table-section");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />

            {/* Pending Requests — clickable: filters candidates to pending */}
            <SpatialStatCard
              title="Pending Requests"
              value={stats?.pendingRequests ?? 0}
              subtitle="Awaiting candidate response"
              icon={Clock}
              iconVariant="amber"
              onClick={() => {
                setComplianceFilter("pending");
                setTimeout(() => {
                  const el = document.getElementById("candidate-table-section");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
            />

            {/* Completed Packets — clickable: scrolls to candidate table (no filter) */}
            <SpatialStatCard
              title="Completed Packets"
              value={stats?.completedPackets ?? 0}
              subtitle="Fully verified checklists"
              icon={CheckCircle2}
              iconVariant="primary"
              onClick={() => {
                setComplianceFilter("all");
                setTimeout(() => {
                  const el = document.getElementById("candidate-table-section");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
            />

            {/* Credits Used — clickable: navigates to billing */}
            <SpatialStatCard
              title={`Credits Used${period === "all" ? "" : ` ${period === "week" ? "This Week" : "This Month"}`}`}
              value={stats?.creditsUsedThisMonth ?? 0}
              subtitle={`of ${stats?.creditsBalance ?? 0} remaining`}
              icon={CreditCard}
              iconVariant="terra"
              onClick={() => router.push("/recruiter/billing")}
            />

            {/* BAA Status — clickable: navigates to BAA page */}
            <SpatialStatCard
              title="BAA Status"
              value={getBaaBadge(stats?.baaStatus ?? "pending")}
              subtitle="Business Associate Agreement"
              icon={FileCheck}
              iconVariant="primary"
              onClick={() => router.push("/recruiter/baa")}
            />
          </>
        )}
      </div>

      {/* ── BOB Summary Widget ────────────────────────────────────── */}
      <BobSummaryWidget />

      {/* ── Filter Bar + Candidate Table ───────────────────────────── */}
      <Card id="candidate-table-section">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Candidates</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: "var(--text-muted)" }} />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-56"
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
                      <span className="size-2 rounded-full" style={{ background: "var(--primary)" }} />
                      Compliant
                    </span>
                  </SelectItem>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: "var(--status-amber)" }} />
                      Pending
                    </span>
                  </SelectItem>
                  <SelectItem value="non_compliant">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: "var(--status-red)" }} />
                      Non-Compliant
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Export CSV */}
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || filteredCandidates.length === 0}>
                <Download className="size-3.5" />
                Export
              </Button>
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
            /* ── Empty state / Onboarding — spatial empty state ───────── */
            <div className="empty-state">
              <div
                className="empty-state-icon"
                style={{
                  background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(45,90,61,0.32)",
                  color: "#fff",
                }}
              >
                <Send className="size-7" />
              </div>
              <h3 className="empty-state-title">Welcome! Get started by sending your first request</h3>
              <p className="empty-state-description">
                Send a verification request to a candidate to begin tracking their compliance and documents. It only takes a moment.
              </p>
              <Button asChild className="mt-4">
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => {
                    const fullName =
                      [candidate.firstName, candidate.lastName]
                        .filter(Boolean)
                        .join(" ") || candidate.email;
                    const avatarInitial = candidate.firstName?.[0]?.toUpperCase() ??
                      candidate.email[0]?.toUpperCase() ?? "U";
                    const avatarVariant = (candidate.id % 2 === 0 ? "primary" : "terra") as "primary" | "terra";

                    return (
                      <TableRow key={candidate.id} className="group">
                        {/* Candidate Name — clickable link */}
                        <TableCell>
                          <Link
                            href={`/recruiter/candidates/${candidate.id}`}
                            className="flex items-center gap-3"
                          >
                            <SpatialAvatar initials={avatarInitial} variant={avatarVariant} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate group-hover:text-primary group-hover:underline underline-offset-2 transition-colors">
                                {fullName}
                              </p>
                              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                {candidate.email}
                              </p>
                            </div>
                          </Link>
                        </TableCell>

                        {/* Specialty */}
                        <TableCell>
                          <Link href={`/recruiter/candidates/${candidate.id}`} className="text-sm hover:text-primary transition-colors">
                            {candidate.specialty || "—"}
                          </Link>
                        </TableCell>

                        {/* Checklist Status */}
                        <TableCell>
                          <Link href={`/recruiter/candidates/${candidate.id}`}>
                            <div className="flex items-center gap-2">
                              {getComplianceDot(candidate.complianceStatus)}
                              {getComplianceBadge(candidate.complianceStatus)}
                            </div>
                          </Link>
                        </TableCell>

                        {/* Documents Shared */}
                        <TableCell>
                          <Link href={`/recruiter/candidates/${candidate.id}`} className="inline-flex items-center gap-1 text-sm">
                            <FileText className="size-3.5" style={{ color: "var(--text-muted)" }} />
                            {candidate.sharedDocuments.length}
                          </Link>
                        </TableCell>

                        {/* Last Activity */}
                        <TableCell>
                          <Link href={`/recruiter/candidates/${candidate.id}`} className="text-sm hover:text-primary transition-colors" style={{ color: "var(--text-secondary)" }}>
                            {formatDate(candidate.lastActivity)}
                          </Link>
                        </TableCell>

                        {/* Actions — Send Reminder for non-compliant/pending */}
                        <TableCell className="text-right">
                          {candidate.complianceStatus !== "compliant" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSendReminder(candidate.id);
                              }}
                              disabled={sendingReminderId === candidate.id}
                            >
                              <BellRing className="size-3" />
                              {sendingReminderId === candidate.id ? (
                                <>
                                  <Loader2 className="size-3 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                "Send Reminder"
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                          )}
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
            <div className="flex items-center justify-between pt-4 border-t mt-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Showing {filteredCandidates.length} of {data?.candidates.length ?? 0}{" "}
                candidate{(data?.candidates.length ?? 0) !== 1 ? "s" : ""}
              </p>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/recruiter/requests">
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

// ─── BOB Summary Widget ─────────────────────────────────────────────
function BobSummaryWidget() {
  const [bobStats, setBobStats] = useState<{
    total: number;
    by_status: Record<string, number>;
    by_tag: { hot: number; warm: number; cold: number; inactive: number };
    active: number;
    in_pool: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBob() {
      try {
        const res = await fetch("/api/recruiter/bob?view=my_bob&limit=500");
        if (res.ok) {
          const data = await res.json();
          setBobStats(data.stats);
        }
      } catch (err) {
        console.error("[BOB WIDGET]", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBob();
  }, []);

  if (loading) {
    return <Skeleton className="h-24 w-full rounded-[20px]" />;
  }

  if (!bobStats || bobStats.total === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Your Book of Business is empty</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Add your first candidate lead to start tracking them through the pipeline.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/recruiter/candidates">
              <Users className="size-3.5 mr-1.5" />
              Add a lead
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="size-4" style={{ color: "var(--primary)" }} />
            <h3 className="text-sm font-semibold text-foreground font-heading">Book of Business</h3>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/recruiter/candidates">
              View all
              <ArrowUpRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Active in BOB */}
          <Link href="/recruiter/candidates" className="block p-2 rounded-[12px] transition-colors" style={{ background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--material-thin-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <p className="text-2xl font-bold text-foreground tabular-nums">{bobStats.active}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Active</p>
          </Link>

          {/* Hot leads */}
          <Link href="/recruiter/candidates?tag=hot" className="block p-2 rounded-[12px] transition-colors" style={{ background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--material-thin-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--status-red)" }}>{bobStats.by_tag.hot}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>🔥 Hot (7d)</p>
          </Link>

          {/* Cold leads */}
          <Link href="/recruiter/candidates?tag=cold" className="block p-2 rounded-[12px] transition-colors" style={{ background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--material-thin-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--status-blue)" }}>{bobStats.by_tag.cold}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>❄️ Cold (15-30d)</p>
          </Link>

          {/* Company Pool */}
          <Link href="/recruiter/candidates?view=company_pool" className="block p-2 rounded-[12px] transition-colors" style={{ background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--material-thin-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>{bobStats.in_pool}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Company Pool</p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
