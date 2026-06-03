"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  SkipForward,
  CheckCheck,
  Clock,
  Filter,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface ReminderTarget {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
}

interface ReminderRule {
  id: number;
  ruleName: string;
  triggerCondition: string;
  actionType: string;
}

interface Reminder {
  id: number;
  ruleId: number;
  targetUserId: number;
  messagePreview: string;
  status: string;
  createdAt: string;
  targetUser: ReminderTarget;
  rule: ReminderRule;
}

interface ReminderStats {
  awaitingCount: number;
  approvedToday: number;
  skippedToday: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRuleTypeBadge(triggerCondition: string) {
  if (triggerCondition.includes("credential_expiry") || triggerCondition.includes("expir")) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        Credential Expiry
      </Badge>
    );
  }
  if (triggerCondition.includes("reference")) {
    return (
      <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
        Reference Reminder
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
      {triggerCondition}
    </Badge>
  );
}

function getRuleTypeFilterValue(triggerCondition: string): string {
  if (triggerCondition.includes("credential_expiry") || triggerCondition.includes("expir")) {
    return "credential_expiry";
  }
  if (triggerCondition.includes("reference")) {
    return "reference_reminder";
  }
  return "other";
}

// ─── Skeleton ───────────────────────────────────────────────────────
function ReminderSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<ReminderStats>({ awaitingCount: 0, approvedToday: 0, skippedToday: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [ruleTypeFilter, setRuleTypeFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [approveAllOpen, setApproveAllOpen] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (ruleTypeFilter !== "all") params.set("ruleType", ruleTypeFilter);

      const res = await fetch(`/api/superadmin/reminders?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch reminders");
      }
      const json = await res.json();
      setReminders(json.reminders);
      setStats(json.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load reminders", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [ruleTypeFilter]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleApprove = async (reminderId: number) => {
    try {
      setActionLoading((prev) => ({ ...prev, [reminderId]: true }));
      const res = await fetch("/api/superadmin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", reminderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to approve");
      toast.success("Reminder approved");
      fetchReminders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      toast.error("Approve failed", { description: message });
    } finally {
      setActionLoading((prev) => ({ ...prev, [reminderId]: false }));
    }
  };

  const handleSkip = async (reminderId: number) => {
    try {
      setActionLoading((prev) => ({ ...prev, [reminderId]: true }));
      const res = await fetch("/api/superadmin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip", reminderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to skip");
      toast.success("Reminder skipped");
      fetchReminders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to skip";
      toast.error("Skip failed", { description: message });
    } finally {
      setActionLoading((prev) => ({ ...prev, [reminderId]: false }));
    }
  };

  const handleApproveAll = async () => {
    try {
      setApproveAllLoading(true);
      const res = await fetch("/api/superadmin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to approve all");
      toast.success(`Approved ${json.count} reminders`);
      setApproveAllOpen(false);
      fetchReminders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve all";
      toast.error("Approve all failed", { description: message });
    } finally {
      setApproveAllLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminder Approval"
        description="Approve or skip pending automated reminders across all organizations."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <Select value={ruleTypeFilter} onValueChange={setRuleTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rule Types</SelectItem>
                  <SelectItem value="reference_reminder">Reference Reminder</SelectItem>
                  <SelectItem value="credential_expiry">Credential Expiry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => setApproveAllOpen(true)}
              disabled={isLoading || reminders.length === 0}
            >
              <CheckCheck className="size-4" />
              Approve All
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
            <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="size-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.awaitingCount}</div>
            <p className="text-xs text-muted-foreground">Across all organizations</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{stats.approvedToday}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Skipped Today</CardTitle>
            <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <SkipForward className="size-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">{stats.skippedToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Reminder Cards ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Bell className="size-4 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-base">Pending Reminders</CardTitle>
              <CardDescription>
                {reminders.length} reminder{reminders.length !== 1 ? "s" : ""} awaiting approval
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ReminderSkeleton />
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No pending reminders</h3>
              <p className="text-sm text-muted-foreground">
                All reminders have been processed or none are scheduled.
              </p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border space-y-3">
              {reminders.map((reminder) => {
                const fullName =
                  [reminder.targetUser.firstName, reminder.targetUser.lastName]
                    .filter(Boolean)
                    .join(" ") || reminder.targetUser.email;

                return (
                  <div
                    key={reminder.id}
                    className="rounded-lg border p-4 hover:border-teal-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                        <User className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getRuleTypeBadge(reminder.rule.triggerCondition)}
                          <span className="text-xs text-muted-foreground">
                            {reminder.rule.ruleName}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {reminder.targetUser.email}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {reminder.messagePreview}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {formatTime(reminder.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleSkip(reminder.id)}
                          disabled={actionLoading[reminder.id]}
                        >
                          <SkipForward className="size-3" />
                          Skip
                        </Button>
                        <Button
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                          onClick={() => handleApprove(reminder.id)}
                          disabled={actionLoading[reminder.id]}
                        >
                          <CheckCircle2 className="size-3" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Approve All Confirmation ────────────────────────────────── */}
      <AlertDialog open={approveAllOpen} onOpenChange={setApproveAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve All Reminders</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve all {stats.awaitingCount} pending reminders across all organizations.
              Approved reminders will be sent to their target users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveAllLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveAll}
              disabled={approveAllLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {approveAllLoading ? "Approving…" : `Approve All (${stats.awaitingCount})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
