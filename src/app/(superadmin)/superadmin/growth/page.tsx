"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserPlus, TrendingUp, Mail, Briefcase, Zap,
  ArrowUpRight, ArrowDownRight, RefreshCw, Download,
  CheckCircle2, AlertCircle, Activity,
} from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────
interface GrowthData {
  range: string;
  period: { from: string; to: string };
  totals: {
    totalUsers: number;
    totalSignupsInRange: number;
    verifiedEmails: number;
    completedProfiles: number;
    activationRate: number;
    verificationRate: number;
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
    jobsPosted: number;
    activeJobs: number;
    applications: number;
    placements: number;
  };
  signupsOverTime: { date: string; count: number; byRole: Record<string, number> }[];
  roleBreakdown: { role: string; count: number }[];
  funnel: {
    signup: number;
    verified: number;
    completedProfile: number;
    applied: number;
    placed: number;
  };
  email: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  };
  recentSignups: {
    id: number;
    email: string;
    role: string;
    createdAt: string;
    verified: boolean;
    status: string;
  }[];
  referralCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelative(s: string): string {
  const diffMs = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getRoleColor(role: string): string {
  switch (role) {
    case "candidate": return "bg-blue-100 text-blue-700";
    case "client_recruiter":
    case "client_admin": return "bg-purple-100 text-purple-700";
    case "employer": return "bg-emerald-100 text-emerald-700";
    case "super_admin": return "bg-rose-100 text-rose-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

// ─── Main Component ─────────────────────────────────────────────────
export default function GrowthDashboardPage() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  async function fetchGrowth() {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/growth?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("[GROWTH] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGrowth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchGrowth, 30000);
    return () => clearInterval(interval);
  }, [range]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      {/* ─── Header ─── */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Growth Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track signups, activation, retention, and conversion funnels in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r ? "bg-primary text-white" : "text-text-secondary hover:text-foreground"
                }`}
              >
                {r === "all" ? "All time" : r.toUpperCase()}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchGrowth} disabled={loading}>
            <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* ─── Top-line metrics ─── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={formatNum(data.totals.totalUsers)}
              icon={<Users className="size-5" />}
              accent="from-blue-500 to-cyan-500"
              sub={`+${data.totals.totalSignupsInRange} in ${data.range}`}
            />
            <MetricCard
              title="Daily Active Users"
              value={formatNum(data.totals.dau)}
              icon={<Activity className="size-5" />}
              accent="from-emerald-500 to-teal-500"
              sub={`${formatPct(data.totals.stickiness)} stickiness (DAU/MAU)`}
            />
            <MetricCard
              title="Email Verification"
              value={formatPct(data.totals.verificationRate)}
              icon={<CheckCircle2 className="size-5" />}
              accent="from-violet-500 to-purple-500"
              sub={`${data.totals.verifiedEmails} of ${data.totals.totalSignupsInRange} verified`}
            />
            <MetricCard
              title="Profile Completion"
              value={formatPct(data.totals.activationRate)}
              icon={<TrendingUp className="size-5" />}
              accent="from-amber-500 to-orange-500"
              sub={`${data.totals.completedProfiles} profiles 75%+ complete`}
            />
          </div>

          {/* ─── Second row: retention + jobs ─── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Weekly Active"
              value={formatNum(data.totals.wau)}
              icon={<Users className="size-5" />}
              accent="from-sky-500 to-blue-500"
              sub="Users active in last 7 days"
            />
            <MetricCard
              title="Monthly Active"
              value={formatNum(data.totals.mau)}
              icon={<Users className="size-5" />}
              accent="from-indigo-500 to-purple-500"
              sub="Users active in last 30 days"
            />
            <MetricCard
              title="Jobs Posted"
              value={formatNum(data.totals.jobsPosted)}
              icon={<Briefcase className="size-5" />}
              accent="from-rose-500 to-pink-500"
              sub={`${data.totals.activeJobs} currently active`}
            />
            <MetricCard
              title="Referrals"
              value={formatNum(data.referralCount)}
              icon={<UserPlus className="size-5" />}
              accent="from-fuchsia-500 to-pink-500"
              sub="Referral credits granted"
            />
          </div>

          {/* ─── Signups chart + Role breakdown ─── */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Signups over time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Signups Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {data.signupsOverTime.length === 0 ? (
                  <div className="py-10 text-center text-sm text-text-secondary">
                    No signups in this period yet.
                  </div>
                ) : (
                  <SignupChart data={data.signupsOverTime} />
                )}
              </CardContent>
            </Card>

            {/* Role breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Role Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.roleBreakdown.map((r) => (
                    <div key={r.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block size-2.5 rounded-full ${getRoleColor(r.role).split(" ")[0]}`} />
                        <span className="text-sm capitalize text-foreground">
                          {r.role.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{r.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Conversion Funnel ─── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelChart funnel={data.funnel} />
            </CardContent>
          </Card>

          {/* ─── Email engagement + Recent signups ─── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Email engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Mail className="size-4" /> Email Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{formatNum(data.email.sent)}</div>
                      <div className="text-xs text-text-secondary">Sent</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{formatNum(data.email.opened)}</div>
                      <div className="text-xs text-text-secondary">Opened</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{formatNum(data.email.clicked)}</div>
                      <div className="text-xs text-text-secondary">Clicked</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-secondary">Open rate</span>
                        <span className="font-medium text-foreground">{formatPct(data.email.openRate)}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(data.email.openRate, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-secondary">Click rate</span>
                        <span className="font-medium text-foreground">{formatPct(data.email.clickRate)}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(data.email.clickRate, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent signups */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="size-4" /> Recent Signups (live)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {data.recentSignups.length === 0 ? (
                    <div className="py-6 text-center text-sm text-text-secondary">
                      No signups yet.
                    </div>
                  ) : (
                    data.recentSignups.map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="truncate font-medium text-foreground">{u.email}</span>
                          {u.verified ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertCircle className="size-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`text-xs ${getRoleColor(u.role)}`}>
                            {u.role.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-text-secondary">{formatRelative(u.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Footer ─── */}
          <div className="flex items-center justify-between text-xs text-text-secondary pt-4 border-t border-border">
            <span>
              Showing data for: <strong>{data.range === "all" ? "all time" : `last ${data.range}`}</strong> · {formatDate(data.period.from)} → {formatDate(data.period.to)}
            </span>
            <span>Auto-refreshes every 30s</span>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center">
          <AlertCircle className="size-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Failed to load growth data.</p>
          <Button variant="outline" size="sm" onClick={fetchGrowth} className="mt-3">
            <RefreshCw className="size-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  icon,
  accent,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">{title}</span>
          <div className={`size-9 rounded-lg bg-gradient-to-br ${accent} text-white flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
        {sub && <div className="text-xs text-text-secondary mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SignupChart({ data }: { data: { date: string; count: number; byRole: Record<string, number> }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 180;
  const barWidth = Math.max(8, Math.floor(640 / Math.max(data.length, 1)));

  return (
    <div className="flex items-end gap-1 overflow-x-auto" style={{ height: chartHeight + 30 }}>
      {data.map((d) => {
        const h = (d.count / maxCount) * chartHeight;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 shrink-0" style={{ width: barWidth }}>
            <div className="text-[10px] text-text-secondary font-medium">{d.count > 0 ? d.count : ""}</div>
            <div
              className="w-full rounded-t bg-gradient-to-t from-blue-500 to-cyan-400 min-h-[2px]"
              style={{ height: Math.max(h, 2) }}
              title={`${d.date}: ${d.count} signups`}
            />
            <div className="text-[9px] text-text-secondary">
              {new Date(d.date).getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: { signup: number; verified: number; completedProfile: number; applied: number; placed: number } }) {
  const stages = [
    { label: "Signed up", value: funnel.signup, color: "bg-blue-500" },
    { label: "Verified email", value: funnel.verified, color: "bg-cyan-500" },
    { label: "Completed profile", value: funnel.completedProfile, color: "bg-violet-500" },
    { label: "Applied to job", value: funnel.applied, color: "bg-amber-500" },
    { label: "Placed", value: funnel.placed, color: "bg-emerald-500" },
  ];
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const width = (stage.value / maxValue) * 100;
        const conv = i === 0 ? 100 : (stage.value / stages[0].value) * 100;
        return (
          <div key={stage.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-foreground">{stage.label}</span>
              <span className="text-text-secondary">
                <strong className="text-foreground">{stage.value}</strong>
                {i > 0 && <span className="ml-2 text-xs">({conv.toFixed(1)}% of signups)</span>}
              </span>
            </div>
            <div className="h-7 bg-secondary rounded-md overflow-hidden">
              <div
                className={`h-full ${stage.color} flex items-center justify-end px-2 text-white text-xs font-medium`}
                style={{ width: `${Math.max(width, stage.value > 0 ? 5 : 0)}%` }}
              >
                {stage.value > 0 && stage.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
