"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building2,
  TrendingUp,
  RefreshCw,
  Loader2,
  Eye,
  Download,
  Flag,
  Inbox,
  Send,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ─── Types ──────────────────────────────────────────────────────────
interface RequestHistoryItem {
  id: number;
  status: string;
  completionPct: number;
  createdAt: string;
  template: { profession: string; specialty: string; name: string } | null;
  candidate: { id: number; firstName: string | null; lastName: string | null; email: string } | null;
}

interface RecruiterItem {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  companyName: string;
  companyId: number | null;
  totalRequests: number;
  completed: number;
  pending: number;
  lastActivity: string | null;
  requestHistory: RequestHistoryItem[];
}

interface TopRecruiter {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  requestCount: number;
  companyName: string;
}

interface RecruitersData {
  recruiters: RecruiterItem[];
  stats: {
    totalActiveRecruiters: number;
    avgRequestsPerRecruiter: number;
    topRecruiters: TopRecruiter[];
  };
}

// ─── Helpers ────────────────────────────────────────────────────────
function getName(item: { firstName: string | null; lastName: string | null; email: string }): string {
  return [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getRequestStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">Completed</Badge>;
    case "opened":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[10px]">Opened</Badge>;
    case "sent":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">Sent</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SkillsRecruitersPage() {
  const [data, setData] = useState<RecruitersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("all");

  // Flag dialog
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagRecruiter, setFlagRecruiter] = useState<RecruiterItem | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);

  // Companies for filter
  const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterCompanyId !== "all") params.set("companyId", filterCompanyId);

      const res = await fetch(`/api/superadmin/skills/recruiters?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch recruiters");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load recruiters", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterCompanyId]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/companies");
      if (res.ok) {
        const json = await res.json();
        setCompanies((json.companies || []).map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFlagRecruiter = async () => {
    if (!flagRecruiter || !flagReason.trim()) {
      toast.error("Please provide a reason for flagging");
      return;
    }
    try {
      setFlagLoading(true);
      toast.success(`Recruiter ${getName(flagRecruiter)} flagged successfully`);
      setFlagDialogOpen(false);
      setFlagReason("");
    } finally {
      setFlagLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruiters"
        description="All recruiters who have sent checklist requests"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* ─── Stats ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.totalActiveRecruiters}</p>
                  <p className="text-xs text-muted-foreground">Active Recruiters</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shrink-0">
                  <Send className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.avgRequestsPerRecruiter}</p>
                  <p className="text-xs text-muted-foreground">Avg Requests/Recruiter</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 shrink-0">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-lg font-bold truncate">
                    {data.stats.topRecruiters.map((r) => getName(r)).join(", ") || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Top Recruiters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ─── Search & Filter ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recruiters by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCompanyId} onValueChange={setFilterCompanyId}>
          <SelectTrigger className="w-full sm:w-56">
            <Filter className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── Table ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : !data?.recruiters.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No recruiters found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No recruiters have sent checklist requests yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recruiters.map((recruiter) => (
                    <>
                      <TableRow
                        key={recruiter.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedRow(expandedRow === recruiter.id ? null : recruiter.id)}
                      >
                        <TableCell>
                          {expandedRow === recruiter.id ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{getName(recruiter)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{recruiter.email}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Building2 className="size-3.5 text-muted-foreground" />
                            {recruiter.companyName}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{recruiter.totalRequests}</TableCell>
                        <TableCell className="text-center text-sm text-emerald-700">{recruiter.completed}</TableCell>
                        <TableCell className="text-center text-sm text-amber-700">{recruiter.pending}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(recruiter.lastActivity)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              title="Flag recruiter"
                              onClick={() => { setFlagRecruiter(recruiter); setFlagDialogOpen(true); }}
                            >
                              <Flag className="size-3.5 text-amber-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRow === recruiter.id && (
                        <TableRow key={`${recruiter.id}-expanded`}>
                          <TableCell colSpan={9} className="bg-gray-50 p-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              Request History ({recruiter.requestHistory.length})
                            </p>
                            {!recruiter.requestHistory.length ? (
                              <p className="text-xs text-muted-foreground">No request history</p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Candidate</TableHead>
                                      <TableHead className="text-xs">Template</TableHead>
                                      <TableHead className="text-xs">Status</TableHead>
                                      <TableHead className="text-xs">Sent</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {recruiter.requestHistory.map((req) => (
                                      <TableRow key={req.id}>
                                        <TableCell className="text-xs">
                                          {req.candidate ? getName(req.candidate) : "Unknown"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {req.template ? `${req.template.profession} — ${req.template.specialty}` : "—"}
                                        </TableCell>
                                        <TableCell>{getRequestStatusBadge(req.status)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {formatRelativeTime(req.createdAt)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
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

      {/* ─── Flag Dialog ──────────────────────────────────────────────── */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Recruiter</DialogTitle>
            <DialogDescription>
              Flag {flagRecruiter ? getName(flagRecruiter) : "this recruiter"} for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for flagging</Label>
              <Textarea
                placeholder="Describe why you are flagging this recruiter..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleFlagRecruiter}
              disabled={flagLoading}
            >
              {flagLoading && <Loader2 className="size-4 animate-spin mr-2" />}
              Flag Recruiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
