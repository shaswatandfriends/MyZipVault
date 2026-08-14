"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  LayoutDashboard,
  Phone,
  UserCheck,
  Users,
  AlertTriangle,
  BarChart3,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────
interface DailyCallCount {
  date: string;
  scheduled: number;
  completed: number;
  missed: number;
}

interface RecruiterStat {
  recruiterId: number;
  name: string;
  organization: string;
  activeLeads: number;
  callsToday: number;
  callsWeek: number;
  overdueCalls: number;
  weeklyCalls?: WeeklyCall[];
}

interface WeeklyCall {
  id: number;
  leadName: string;
  scheduledDate: string;
  status: string;
}

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
}

interface CalendarData {
  dailyCallCounts: DailyCallCount[];
  recruiterStats: RecruiterStat[];
  pipelineOverview: PipelineStage[];
}

interface Organization {
  id: number;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
function getMonthName(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDay();
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr === todayStr;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const PIPELINE_COLORS: Record<string, string> = {
  new_lead: "var(--pipeline-new-lead)",
  doc_pending: "var(--pipeline-doc-pending)",
  interested: "var(--pipeline-interested-no-job)", // reuse closest CSS var
  submitted: "var(--pipeline-submitted)",
  interview_stage: "var(--pipeline-interview-scheduled)", // reuse closest CSS var
  offer_sent: "var(--pipeline-offer-sent)",
  offer_accepted: "var(--pipeline-offer-sent)", // reuse
  onboarding: "var(--pipeline-onboarding)",
  on_assignment: "var(--pipeline-started)", // reuse
  inactive: "var(--pipeline-not-interested)", // reuse
  not_interested: "var(--pipeline-not-interested)",
  blacklisted: "var(--pipeline-not-interested)", // reuse
};

// ─── Skeletons ──────────────────────────────────────────────────────
function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-md" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

// ─── Overview Tab: Monthly Calendar ─────────────────────────────────
function OverviewCalendar({
  dailyCallCounts,
  isLoading,
  currentYear,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  selectedDay,
  onSelectDay,
}: {
  dailyCallCounts: DailyCallCount[];
  isLoading: boolean;
  currentYear: number;
  currentMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}) {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Build a map for quick lookup
  const countMap = useMemo(() => {
    const map: Record<string, DailyCallCount> = {};
    for (const dc of dailyCallCounts) {
      map[dc.date] = dc;
    }
    return map;
  }, [dailyCallCounts]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayData = selectedDay ? countMap[selectedDay] : null;
  const totalScheduled = dailyCallCounts.reduce((s, d) => s + d.scheduled, 0);
  const totalCompleted = dailyCallCounts.reduce((s, d) => s + d.completed, 0);
  const totalMissed = dailyCallCounts.reduce((s, d) => s + d.missed, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="size-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{totalScheduled}</div>
            <p className="text-xs text-muted-foreground mt-1">Calls scheduled this month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <UserCheck className="size-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">Calls completed this month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Missed / Overdue</CardTitle>
            <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{totalMissed}</div>
            <p className="text-xs text-muted-foreground mt-1">Missed or overdue calls</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="size-5 text-teal-600" />
                {getMonthName(currentYear, currentMonth)}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="size-8" onClick={onPrevMonth} aria-label="Previous month">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" onClick={onNextMonth} aria-label="Next month">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CalendarSkeleton />
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {dayNames.map((dn) => (
                    <div
                      key={dn}
                      className="text-center text-xs font-medium text-muted-foreground py-1"
                    >
                      {dn}
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="h-20 rounded-md bg-muted/20" />;
                    }
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dc = countMap[dateStr];
                    const total = (dc?.scheduled ?? 0) + (dc?.completed ?? 0) + (dc?.missed ?? 0);
                    const isSelected = selectedDay === dateStr;
                    const today = isToday(dateStr);

                    return (
                      <button
                        key={dateStr}
                        onClick={() => onSelectDay(dateStr)}
                        className={`h-20 rounded-md border text-left p-1.5 transition-all hover:shadow-sm ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                            : today
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-border bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-medium ${
                              today ? "text-emerald-700" : "text-foreground"
                            }`}
                          >
                            {day}
                          </span>
                          {total > 0 && (
                            <span className="text-[10px] text-muted-foreground">{total}</span>
                          )}
                        </div>
                        {total > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {(dc?.scheduled ?? 0) > 0 && (
                              <div className="h-1.5 rounded-full bg-blue-400 w-full" title={`${dc!.scheduled} scheduled`} />
                            )}
                            {(dc?.completed ?? 0) > 0 && (
                              <div className="h-1.5 rounded-full bg-emerald-400 w-full" title={`${dc!.completed} completed`} />
                            )}
                            {(dc?.missed ?? 0) > 0 && (
                              <div className="h-1.5 rounded-full bg-red-400 w-full" title={`${dc!.missed} missed`} />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-400" /> Scheduled
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400" /> Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red-400" /> Missed / Overdue
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Day summary panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="size-5 text-teal-600" />
              Day Summary
            </CardTitle>
            <CardDescription>
              {selectedDay ? formatShortDate(selectedDay) : "Click a day to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a day from the calendar</p>
              </div>
            ) : !selectedDayData ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No calls on this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Clock className="size-4 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Scheduled</p>
                    <p className="text-xs text-muted-foreground">Upcoming calls</p>
                  </div>
                  <span className="text-lg font-bold text-blue-700">{selectedDayData.scheduled}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <UserCheck className="size-4 text-emerald-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-xs text-muted-foreground">Successfully connected</p>
                  </div>
                  <span className="text-lg font-bold text-emerald-700">{selectedDayData.completed}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="size-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="size-4 text-red-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Missed / Overdue</p>
                    <p className="text-xs text-muted-foreground">No answer or past due</p>
                  </div>
                  <span className="text-lg font-bold text-red-700">{selectedDayData.missed}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total calls</span>
                    <span className="font-semibold">
                      {selectedDayData.scheduled + selectedDayData.completed + selectedDayData.missed}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Recruiters Tab ─────────────────────────────────────────────────
function RecruitersTab({
  recruiterStats,
  isLoading,
  organizations,
  companyFilter,
  onCompanyFilterChange,
}: {
  recruiterStats: RecruiterStat[];
  isLoading: boolean;
  organizations: Organization[];
  companyFilter: string;
  onCompanyFilterChange: (v: string) => void;
}) {
  const [expandedRecruiter, setExpandedRecruiter] = useState<number | null>(null);

  const filteredStats = useMemo(() => {
    if (!companyFilter || companyFilter === "all") return recruiterStats;
    return recruiterStats.filter((r) => r.organization === companyFilter);
  }, [recruiterStats, companyFilter]);

  const totalActiveLeads = filteredStats.reduce((s, r) => s + r.activeLeads, 0);
  const totalCallsToday = filteredStats.reduce((s, r) => s + r.callsToday, 0);
  const totalCallsWeek = filteredStats.reduce((s, r) => s + r.callsWeek, 0);
  const totalOverdue = filteredStats.reduce((s, r) => s + r.overdueCalls, 0);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Active Leads</p>
            <p className="text-2xl font-bold text-emerald-700">{totalActiveLeads}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Calls Today</p>
            <p className="text-2xl font-bold text-blue-700">{totalCallsToday}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Calls This Week</p>
            <p className="text-2xl font-bold text-teal-700">{totalCallsWeek}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Overdue Calls</p>
            <p className="text-2xl font-bold text-red-700">{totalOverdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={companyFilter} onValueChange={onCompanyFilterChange}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.name}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-5 text-teal-600" />
            Recruiter Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : filteredStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No recruiters found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {companyFilter && companyFilter !== "all"
                  ? "Try changing the company filter."
                  : "No recruiter data available yet."}
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Active Leads</TableHead>
                    <TableHead className="text-right">Calls Today</TableHead>
                    <TableHead className="text-right">Calls This Week</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.map((recruiter) => (
                    <>
                      <TableRow
                        key={recruiter.recruiterId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedRecruiter(
                            expandedRecruiter === recruiter.recruiterId
                              ? null
                              : recruiter.recruiterId
                          )
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold shrink-0">
                              {recruiter.name[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="font-medium text-sm">{recruiter.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {recruiter.organization}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            {recruiter.activeLeads}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-blue-700">
                          {recruiter.callsToday}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-teal-700">
                          {recruiter.callsWeek}
                        </TableCell>
                        <TableCell className="text-right">
                          {recruiter.overdueCalls > 0 ? (
                            <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                              {recruiter.overdueCalls}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRecruiter === recruiter.recruiterId && (
                        <TableRow key={`${recruiter.recruiterId}-expanded`}>
                          <TableCell colSpan={6} className="bg-muted/20 p-4">
                            <WeeklyCallsDetail recruiterId={recruiter.recruiterId} recruiterName={recruiter.name} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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

// ─── Sub-component: Weekly Calls Detail ─────────────────────────────
function WeeklyCallsDetail({ recruiterId, recruiterName }: { recruiterId: number; recruiterName: string }) {
  const [calls, setCalls] = useState<WeeklyCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const res = await fetch(`/api/superadmin/calendar?month=${monthStr}&recruiterId=${recruiterId}`);
        if (!res.ok) {
          setCalls([]);
          return;
        }
        const json = await res.json();
        setCalls(json.recruiterWeeklyCalls ?? []);
      } catch {
        setCalls([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, [recruiterId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">This week&apos;s calls for {recruiterName}</p>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm font-medium text-muted-foreground">This week&apos;s calls for {recruiterName}</p>
        <p className="text-xs text-muted-foreground mt-1">No calls scheduled this week</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">This week&apos;s calls for {recruiterName}</p>
      <div className="max-h-40 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call) => (
              <TableRow key={call.id}>
                <TableCell className="text-sm">{call.leadName}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(call.scheduledDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      call.status === "completed"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                        : call.status === "scheduled"
                          ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
                          : call.status === "no_answer"
                            ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
                            : "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
                    }
                  >
                    {call.status.replace("_", " ")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Pipeline Overview Tab ──────────────────────────────────────────
function PipelineTab({
  pipelineOverview,
  isLoading,
  organizations,
  companyFilter,
  onCompanyFilterChange,
}: {
  pipelineOverview: PipelineStage[];
  isLoading: boolean;
  organizations: Organization[];
  companyFilter: string;
  onCompanyFilterChange: (v: string) => void;
}) {
  const totalLeads = pipelineOverview.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Active Leads</CardTitle>
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="size-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all pipeline stages</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Stages</CardTitle>
            <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <LayoutDashboard className="size-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-700">{pipelineOverview.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active stages in the pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={companyFilter} onValueChange={onCompanyFilterChange}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={String(org.id)}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <BarChart3 className="size-4 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-base">Lead Distribution by Pipeline Stage</CardTitle>
              <CardDescription>Number of active leads in each stage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : pipelineOverview.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BarChart3 className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No pipeline data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={pipelineOverview}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                <XAxis type="number" fontSize={12} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  fontSize={12}
                  tickLine={false}
                  width={95}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: number) => [`${value} leads`, "Count"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                  {pipelineOverview.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={PIPELINE_COLORS[entry.stage] || "var(--text-muted)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Stage cards */}
      {!isLoading && pipelineOverview.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pipelineOverview.map((stage) => {
            const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
            return (
              <Card key={stage.stage} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{stage.label}</span>
                    <span className="text-lg font-bold" style={{ color: PIPELINE_COLORS[stage.stage] || "var(--text-muted)" }}>
                      {stage.count}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: PIPELINE_COLORS[stage.stage] || "var(--text-muted)",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct}% of total</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminCalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Calendar month state
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  // Filters
  const [companyFilter, setCompanyFilter] = useState("all");
  const [pipelineCompanyFilter, setPipelineCompanyFilter] = useState("all");

  // Selected day
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ month: monthStr });
      if (companyFilter && companyFilter !== "all") {
        params.set("companyId", companyFilter);
      }
      if (pipelineCompanyFilter && pipelineCompanyFilter !== "all") {
        // Pipeline uses its own filter, but we can't send two different companyId params
        // For the main fetch, we'll not filter by company and filter client-side for recruiters
        // The pipeline tab will re-fetch with its own filter
      }
      const res = await fetch(`/api/superadmin/calendar?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch calendar data");
      }
      const json = (await res.json()) as CalendarData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load calendar data", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [monthStr, companyFilter]);

  const fetchPipelineData = useCallback(async () => {
    if (pipelineCompanyFilter === "all" || !pipelineCompanyFilter) return;
    try {
      const params = new URLSearchParams({ month: monthStr, companyId: pipelineCompanyFilter });
      const res = await fetch(`/api/superadmin/calendar?${params.toString()}`);
      if (!res.ok) return;
      const json = (await res.json()) as CalendarData;
      setData((prev) => (prev ? { ...prev, pipelineOverview: json.pipelineOverview } : json));
    } catch {
      // Silently fail - keep existing data
    }
  }, [monthStr, pipelineCompanyFilter]);

  // Fetch organizations for filters
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch("/api/superadmin/companies");
        if (!res.ok) return;
        const json = await res.json();
        setOrganizations(
          (json.companies ?? []).map((c: { id: number; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      } catch {
        // Silently fail
      }
    };
    fetchOrgs();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar Overview"
        description="Read-only overview of all call activity across the platform."
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <CalendarDays className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="recruiters" className="gap-1.5">
            <Users className="size-4" />
            Recruiters
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <BarChart3 className="size-4" />
            Pipeline Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewCalendar
            dailyCallCounts={data?.dailyCallCounts ?? []}
            isLoading={isLoading}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </TabsContent>

        <TabsContent value="recruiters">
          <RecruitersTab
            recruiterStats={data?.recruiterStats ?? []}
            isLoading={isLoading}
            organizations={organizations}
            companyFilter={companyFilter}
            onCompanyFilterChange={setCompanyFilter}
          />
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineTab
            pipelineOverview={data?.pipelineOverview ?? []}
            isLoading={isLoading}
            organizations={organizations}
            companyFilter={pipelineCompanyFilter}
            onCompanyFilterChange={setPipelineCompanyFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
