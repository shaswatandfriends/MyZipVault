"use client";

/**
 * BOB (Book of Business) — Recruiter landing page
 *
 * This is the recruiter's command center. Three views:
 *   1. Kanban — candidates grouped by status (drag to change status)
 *   2. List — sortable/filterable table of all leads
 *   3. Company Pool — claimable candidates (inactive/not_interested/blacklisted)
 *
 * Top metrics: total active, in company pool, hot leads, pending next actions
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus, Search, LayoutGrid, List as ListIcon, Users, Building2,
  Flame, Clock, Loader2, AlertCircle, ChevronRight,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadCard, type LeadCardData } from "@/components/bob/lead-card";
import { AddLeadDialog } from "@/components/bob/add-lead-dialog";
import {
  ALL_STATUSES, STATUS_META, TAG_META, SOURCE_OPTIONS,
  type CandidateStatus,
} from "@/lib/bob/types";

type ViewMode = "kanban" | "list" | "company_pool";

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_tag: { hot: number; warm: number; cold: number; inactive: number };
  active: number;
  in_pool: number;
}

export default function BOBPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadCardData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View + filters
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("last_activity");

  // Add lead dialog
  const [showAddLead, setShowAddLead] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("view", view === "company_pool" ? "company_pool" : view === "list" ? "my_bob" : "my_bob");
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (tagFilter !== "all") params.set("tag", tagFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      params.set("sort", sort);

      const res = await fetch(`/api/recruiter/bob?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch leads");
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error("[BOB PAGE]", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view, search, statusFilter, tagFilter, sourceFilter, sort]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ─── Kanban columns ─────────────────────────────────────────────
  const kanbanStatuses = view === "company_pool"
    ? (["inactive", "not_interested", "blacklisted"] as CandidateStatus[])
    : (ALL_STATUSES.filter((s) => !["inactive", "not_interested", "blacklisted"].includes(s)) as CandidateStatus[]);

  const leadsByStatus = (status: string) => leads.filter((l) => l.pipeline_stage === status);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Book of Business"
        description="Your candidate pipeline — from cold lead to active assignment."
      />

      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setShowAddLead(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Lead
        </Button>

        {/* View toggle */}
        <div className="flex items-center bg-surface-2 rounded-md p-0.5">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-text-secondary hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "list" ? "bg-background text-foreground shadow-sm" : "text-text-secondary hover:text-foreground"
            }`}
          >
            <ListIcon className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView("company_pool")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "company_pool" ? "bg-background text-foreground shadow-sm" : "text-text-secondary hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> Company Pool
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-xs relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Metrics */}
      {stats && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Active in BOB"
            value={stats.active}
            icon={<Users className="h-4 w-4" />}
            color="text-primary"
          />
          <MetricCard
            label={view === "company_pool" ? "In Company Pool" : "In Company Pool"}
            value={stats.in_pool}
            icon={<Building2 className="h-4 w-4" />}
            color="text-text-muted"
          />
          <MetricCard
            label="Hot leads (7d)"
            value={stats.by_tag.hot}
            icon={<Flame className="h-4 w-4" />}
            color="text-red-500"
          />
          <MetricCard
            label="Cold (15-30d)"
            value={stats.by_tag.cold}
            icon={<Clock className="h-4 w-4" />}
            color="text-blue-500"
          />
        </div>
      )}

      {/* Filters (only in list view) */}
      {view === "list" && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].icon} {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {Object.entries(TAG_META).map(([key, t]) => (
                <SelectItem key={key} value={key}>{t.emoji} {t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {SOURCE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_activity">Last activity</SelectItem>
              <SelectItem value="created_at">Date added</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchLeads} className="ml-auto">Retry</Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && leads.length === 0 && (
        <div className="text-center py-16 px-4">
          <Users className="h-12 w-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            {view === "company_pool" ? "Company Pool is empty" : "Your BOB is empty"}
          </h3>
          <p className="text-sm text-text-muted mb-4">
            {view === "company_pool"
              ? "When candidates go inactive or are marked not interested, they'll appear here for any recruiter to claim."
              : "Start building your pipeline by adding your first candidate lead."}
          </p>
          {view !== "company_pool" && (
            <Button onClick={() => setShowAddLead(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add your first lead
            </Button>
          )}
        </div>
      )}

      {/* Kanban view */}
      {!loading && !error && leads.length > 0 && view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStatuses.map((status) => {
            const meta = STATUS_META[status];
            const columnLeads = leadsByStatus(status);
            return (
              <div key={status} className="shrink-0 w-72">
                <div
                  className="rounded-md px-3 py-2 mb-2 flex items-center justify-between"
                  style={{ backgroundColor: meta.bgColor, border: `1px solid ${meta.borderColor}` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{meta.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "#fff", color: meta.color, border: `1px solid ${meta.borderColor}` }}
                  >
                    {columnLeads.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {columnLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="text-center py-6 text-[11px] text-text-muted border border-dashed border-border rounded-lg">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {!loading && !error && leads.length > 0 && view === "list" && (
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      {/* Company Pool view */}
      {!loading && !error && leads.length > 0 && view === "company_pool" && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <strong>Company Pool:</strong> These candidates are not actively being worked by any recruiter.
            Click a card to claim them — they'll move to your BOB automatically.
          </div>
          <div className="space-y-2">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      <AddLeadDialog
        open={showAddLead}
        onOpenChange={setShowAddLead}
        onCreated={(leadId) => {
          fetchLeads();
          router.push(`/recruiter/candidates/${leadId}`);
        }}
      />
    </div>
  );
}

function MetricCard({
  label, value, icon, color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-background border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
