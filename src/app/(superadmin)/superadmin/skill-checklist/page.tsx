"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Building2,
  Link2,
  Mail,
  Clock,
  CheckCircle2,
  Calendar,
  ClipboardCheck,
  ArrowUpDown,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
interface OverviewStats {
  companies: number;
  linksGenerated: number;
  emailsSent: number;
  pending: number;
  completed: number;
  completionRate: number;
}

interface CompanyBreakdownRow {
  name: string;
  linksGenerated: number;
  pending: number;
  completed: number;
  completionRate: number;
  creditsUsed: number;
}

interface RecentActivityRow {
  id: number;
  candidateName: string;
  companyName: string;
  templateName: string;
  status: string;
  date: string;
}

interface OverviewData {
  stats: OverviewStats;
  companyBreakdown: CompanyBreakdownRow[];
  recentActivity: RecentActivityRow[];
}

type SortField = "name" | "linksGenerated" | "pending" | "completed" | "completionRate" | "creditsUsed";
type SortDir = "asc" | "desc";

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Sent
        </Badge>
      );
    case "opened":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Opened
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
          In Progress
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          Completed
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Stat Card Config ──────────────────────────────────────────────
interface StatCardConfig {
  label: string;
  key: keyof OverviewStats;
  icon: typeof Building2;
  iconBg: string;
  iconColor: string;
  format: (val: number) => string;
  sub?: (stats: OverviewStats) => string;
}

const statCards: StatCardConfig[] = [
  {
    label: "Companies",
    key: "companies",
    icon: Building2,
    iconBg: "bg-primary-light",
    iconColor: "text-primary",
    format: (v) => v.toLocaleString(),
    sub: () => "Active organizations",
  },
  {
    label: "Links Generated",
    key: "linksGenerated",
    icon: Link2,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    format: (v) => v.toLocaleString(),
    sub: () => "Checklist requests sent",
  },
  {
    label: "Emails Sent",
    key: "emailsSent",
    icon: Mail,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v) => v.toLocaleString(),
    sub: () => "Emails dispatched",
  },
  {
    label: "Pending",
    key: "pending",
    icon: Clock,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    format: (v) => v.toLocaleString(),
    sub: (s) => `${s.linksGenerated > 0 ? Math.round((s.pending / s.linksGenerated) * 100) : 0}% of total`,
  },
  {
    label: "Completed",
    key: "completed",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v) => v.toLocaleString(),
    sub: (s) => `${s.linksGenerated > 0 ? Math.round((s.completed / s.linksGenerated) * 100) : 0}% of total`,
  },
  {
    label: "Completion Rate",
    key: "completionRate",
    icon: LayoutDashboard,
    iconBg: "bg-primary-light",
    iconColor: "text-[#14532D]",
    format: (v) => `${v}%`,
    sub: (s) => `${s.completed} of ${s.linksGenerated} links`,
  },
];

// ─── Skeletons ──────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function ActivityTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SkillChecklistOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Company table sort
  const [sortField, setSortField] = useState<SortField>("linksGenerated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const qs = params.toString();
      const url = `/api/superadmin/skill-checklist/overview${qs ? `?${qs}` : ""}`;

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch overview data");
      }
      const json = (await res.json()) as OverviewData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load skill checklist overview", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedBreakdown = data
    ? [...data.companyBreakdown].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDir === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sortDir === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      })
    : [];

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={`size-3 ml-1 inline-block ${
        sortField === field ? "opacity-100" : "opacity-30"
      }`}
    />
  );

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Checklist Overview"
        description="Monitor checklist activity across all organizations. Track completion rates, pending requests, and credit usage."
      />

      {/* ── Date Range Filter ────────────────────────────────────── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="size-4" />
              <span>Date Range</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40 text-sm"
                  placeholder="From"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40 text-sm"
                  placeholder="To"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-primary hover:text-[#14532D]"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stat Cards Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          statCards.map((card) => {
            const Icon = card.icon;
            const value = data?.stats[card.key] ?? 0;
            return (
              <Card
                key={card.key}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.label}
                  </CardTitle>
                  <div
                    className={`size-8 rounded-lg ${card.iconBg} flex items-center justify-center`}
                  >
                    <Icon className={`size-4 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.format(value)}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {card.sub
                      ? card.sub(data!.stats)
                      : undefined}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Company Breakdown Table ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-5 text-primary" />
            Company Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Credits Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton />
              </TableBody>
            </Table>
          ) : sortedBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No data yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No checklist activity has been recorded for any company yet.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("name")}
                    >
                      Company
                      <SortIcon field="name" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("linksGenerated")}
                    >
                      Links
                      <SortIcon field="linksGenerated" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("pending")}
                    >
                      Pending
                      <SortIcon field="pending" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("completed")}
                    >
                      Completed
                      <SortIcon field="completed" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("completionRate")}
                    >
                      Completion Rate
                      <SortIcon field="completionRate" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("creditsUsed")}
                    >
                      Credits Used
                      <SortIcon field="creditsUsed" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBreakdown.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-lg bg-primary-light text-primary text-xs font-semibold shrink-0">
                            {row.name[0]?.toUpperCase()}
                          </div>
                          <span>{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.linksGenerated.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.pending > 0 ? (
                          <span className="text-amber-700 font-medium">
                            {row.pending}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.completed > 0 ? (
                          <span className="text-emerald-700 font-medium">
                            {row.completed}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(row.completionRate, 100)}%`,
                                backgroundColor:
                                  row.completionRate >= 75
                                    ? "var(--primary)"
                                    : row.completionRate >= 50
                                    ? "var(--accent-teal)"
                                    : row.completionRate >= 25
                                    ? "#CA8A04"
                                    : "#DC2626",
                              }}
                            />
                          </div>
                          <span className="text-sm tabular-nums w-10 text-right">
                            {row.completionRate}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.creditsUsed.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity Table ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <ActivityTableSkeleton />
              </TableBody>
            </Table>
          ) : data?.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No recent activity</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Checklist requests will appear here as they are sent.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentActivity.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-xs font-semibold shrink-0">
                            {row.candidateName[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span>{row.candidateName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {row.companyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm max-w-[200px] truncate block">
                          {row.templateName}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(row.date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
