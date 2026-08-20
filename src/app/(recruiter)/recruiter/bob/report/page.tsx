"use client";

/**
 * BOB Pipeline Report — admin-only page showing aggregated BOB data.
 *
 * Shows:
 *   - Summary cards (total active, in pool, hot leads, recruiter count)
 *   - Pipeline funnel (visual bars for each of the 12 statuses)
 *   - Tag distribution (hot/warm/cold/inactive)
 *   - Per-recruiter breakdown table
 *
 * Access: client_admin + super_admin only
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Users, Building2, Flame, TrendingUp, Loader2, Download } from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface StatusMetaItem {
  value: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  isActive: boolean;
}

interface RecruiterRow {
  recruiter: { id: number; name: string; email: string };
  total: number;
  active: number;
  inPool: number;
  byStatus: Record<string, number>;
  byTag: { hot: number; warm: number; cold: number; inactive: number };
}

interface ReportData {
  byStatus: Record<string, number>;
  byTag: Record<string, number>;
  byRecruiter: RecruiterRow[];
  totals: { active: number; inPool: number; total: number; recruiters: number };
  statusMeta: StatusMetaItem[];
}

export default function PipelineReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recruiter/bob/report");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load report");
      }
      const reportData = await res.json();
      setData(reportData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxStatusCount = Math.max(...Object.values(data.byStatus), 1);
  const maxRecruiterTotal = Math.max(...data.byRecruiter.map((r) => r.total), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Pipeline Report"
        description="Aggregated BOB data across all recruiters in your organization."
      />

      {/* ─── Summary cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-emerald-600" />
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Active</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.totals.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-text-muted" />
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Company Pool</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.totals.inPool}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-red-500" />
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Hot (7d)</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{data.byTag.hot || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Recruiters</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.totals.recruiters}</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Pipeline funnel ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.statusMeta.map((status) => {
            const count = data.byStatus[status.value] || 0;
            const pct = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
            return (
              <div key={status.value} className="flex items-center gap-3">
                <div className="w-32 shrink-0 flex items-center gap-1.5">
                  <span className="text-sm">{status.icon}</span>
                  <span className="text-xs font-medium text-foreground">{status.label}</span>
                </div>
                <div className="flex-1 h-7 bg-surface-2 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                    style={{
                      width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                      backgroundColor: status.color + "30",
                      border: `1px solid ${status.color}60`,
                    }}
                  >
                    {count > 0 && (
                      <span className="text-xs font-bold" style={{ color: status.color }}>
                        {count}
                      </span>
                    )}
                  </div>
                  {count === 0 && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                      0
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── Tag distribution ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: "hot", label: "🔥 Hot", desc: "Active 0-7 days", color: "#DC2626" },
              { key: "warm", label: "🌡️ Warm", desc: "Active 8-14 days", color: "#F59E0B" },
              { key: "cold", label: "❄️ Cold", desc: "No activity 15-30 days", color: "#3B82F6" },
              { key: "inactive", label: "⏸️ Inactive", desc: "No activity 30+ days", color: "#6B7280" },
            ].map((tag) => {
              const count = data.byTag[tag.key] || 0;
              const total = data.totals.total || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tag.key} className="text-center p-3 rounded-lg border" style={{ borderColor: tag.color + "30" }}>
                  <p className="text-2xl font-bold" style={{ color: tag.color }}>{count}</p>
                  <p className="text-xs font-medium mt-1">{tag.label}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{tag.desc}</p>
                  <p className="text-[10px] text-text-muted mt-1">{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Per-recruiter breakdown ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Recruiter</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byRecruiter.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No recruiters found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-medium text-text-muted">Recruiter</th>
                    <th className="py-2 px-4 font-medium text-text-muted text-center">Total</th>
                    <th className="py-2 px-4 font-medium text-text-muted text-center">Active</th>
                    <th className="py-2 px-4 font-medium text-text-muted text-center">Pool</th>
                    <th className="py-2 px-4 font-medium text-text-muted text-center">🔥 Hot</th>
                    <th className="py-2 px-4 font-medium text-text-muted text-center">❄️ Cold</th>
                    <th className="py-2 pl-4 font-medium text-text-muted">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byRecruiter.map((row) => (
                    <tr key={row.recruiter.id} className="border-b border-border/60 hover:bg-surface-2/50">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{row.recruiter.name}</p>
                        <p className="text-xs text-text-muted">{row.recruiter.email}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-foreground">{row.total}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-emerald-600 font-medium">{row.active}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-text-muted">{row.inPool}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-red-500 font-medium">{row.byTag.hot}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-blue-500">{row.byTag.cold}</span>
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex h-2 rounded-full overflow-hidden bg-surface-2 w-32">
                          <div className="bg-emerald-500" style={{ width: `${(row.active / Math.max(row.total, 1)) * 100}%` }} />
                          <div className="bg-gray-400" style={{ width: `${(row.inPool / Math.max(row.total, 1)) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
