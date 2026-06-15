"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
  ClipboardList,
  ArrowDownRight,
  ArrowRight,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
interface AnalyticsData {
  mrr: number;
  arr: number;
  creditsByMonth: { month: string; purchased: number; spent: number }[];
  agencyBurnRates: {
    organizationId: number;
    organizationName: string;
    creditsPurchased: number;
    creditsSpent: number;
    remaining: number;
    burnRate: number;
  }[];
  candidateFunnel: {
    signup: number;
    profileComplete: number;
    firstChecklist: number;
    firstShare: number;
  };
  mostRequestedChecklists: {
    checklistTemplateId: number;
    checklistName: string;
    requestCount: number;
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ─── Skeleton ───────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/superadmin/analytics?dateRange=${dateRange}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch analytics");
      }
      const json = (await res.json()) as AnalyticsData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load analytics", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const funnel = data?.candidateFunnel;
  const signupCount = funnel?.signup ?? 0;
  const profilePct = signupCount > 0 ? Math.round(((funnel?.profileComplete ?? 0) / signupCount) * 100) : 0;
  const checklistPct = signupCount > 0 ? Math.round(((funnel?.firstChecklist ?? 0) / signupCount) * 100) : 0;
  const sharePct = signupCount > 0 ? Math.round(((funnel?.firstShare ?? 0) / signupCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Revenue"
        description="Revenue metrics, usage analytics, and platform insights."
        actions={
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* ── MRR / ARR Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700">
                  {formatCurrency(data?.mrr ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Estimated from credit purchases</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <TrendingUp className="size-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-teal-700">
                  {formatCurrency(data?.arr ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">MRR × 12 projected</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Credits Chart ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <BarChart3 className="size-4 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-base">Credits Purchased vs Spent</CardTitle>
              <CardDescription>Monthly breakdown for the last 6 months</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (data?.creditsByMonth ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No credit data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.creditsByMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="purchased"
                  name="Purchased"
                  fill="var(--primary-vivid)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="spent"
                  name="Spent"
                  fill="var(--accent-teal)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Agency Burn Rates ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Agency Burn Rates</CardTitle>
                <CardDescription>Credits usage per organization</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.agencyBurnRates ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DollarSign className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No agency data</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead className="text-right">Purchased</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Burn/mo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.agencyBurnRates ?? []).map((org) => (
                      <TableRow key={org.organizationId}>
                        <TableCell className="font-medium text-sm">{org.organizationName}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-700">{org.creditsPurchased}</TableCell>
                        <TableCell className="text-right text-sm text-teal-700">{org.creditsSpent}</TableCell>
                        <TableCell className="text-right text-sm">{org.remaining}</TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={org.burnRate > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                            {org.burnRate}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Candidate Funnel ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Users className="size-4 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base">Candidate Funnel</CardTitle>
                <CardDescription>Signup to first share conversion</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Signup */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50/50 border border-teal-100">
                  <div className="size-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <Users className="size-4 text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Signups</p>
                    <p className="text-xs text-muted-foreground">New candidate registrations</p>
                  </div>
                  <span className="text-lg font-bold text-teal-700">{signupCount}</span>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowDownRight className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground ml-1">100%</span>
                </div>

                {/* Profile Complete */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Users className="size-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Profile Complete</p>
                    <p className="text-xs text-muted-foreground">80%+ profile completion</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-700">{funnel?.profileComplete ?? 0}</span>
                    <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs">
                      {profilePct}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowDownRight className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground ml-1">{profilePct}%</span>
                </div>

                {/* First Checklist */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50/50 border border-teal-100">
                  <div className="size-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="size-4 text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">First Checklist</p>
                    <p className="text-xs text-muted-foreground">Completed at least one checklist</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-teal-700">{funnel?.firstChecklist ?? 0}</span>
                    <Badge className="ml-2 bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100 text-xs">
                      {checklistPct}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground ml-1">{checklistPct}%</span>
                </div>

                {/* First Share */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <ArrowRight className="size-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">First Share</p>
                    <p className="text-xs text-muted-foreground">Shared data with a recruiter</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-700">{funnel?.firstShare ?? 0}</span>
                    <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs">
                      {sharePct}%
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Most Requested Checklists ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ClipboardList className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Most Requested Checklists</CardTitle>
              <CardDescription>Top checklists by request volume</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data?.mostRequestedChecklists ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No checklist requests in this period</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Checklist Name</TableHead>
                    <TableHead className="text-right">Request Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.mostRequestedChecklists ?? []).map((cl, i) => (
                    <TableRow key={cl.checklistTemplateId}>
                      <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{cl.checklistName}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
                          {cl.requestCount}
                        </Badge>
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
