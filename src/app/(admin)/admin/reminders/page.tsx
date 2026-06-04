"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  SkipForward,
  Clock,
  Mail,
  FileText,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ──────────────────────────────────────────────────────────
interface ReminderItem {
  id: number;
  ruleId: number;
  targetUserId: number;
  messagePreview: string;
  status: string;
  createdAt: string;
  rule: {
    id: number;
    ruleName: string;
    actionType: string;
  };
  targetUser: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface RemindersData {
  reminders: ReminderItem[];
  stats: {
    awaitingApproval: number;
    approvedToday: number;
    skippedToday: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActionTypeBadge(actionType: string) {
  switch (actionType) {
    case "send_email":
      return (
        <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
          <Mail className="size-3" />
          Email
        </Badge>
      );
    case "credential_expiry":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <FileText className="size-3" />
          Credential Expiry
        </Badge>
      );
    case "reference_request":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          <Bell className="size-3" />
          Reference
        </Badge>
      );
    default:
      return <Badge variant="outline">{actionType}</Badge>;
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────
function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
      </CardContent>
    </Card>
  );
}

function ReminderCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminRemindersPage() {
  const [data, setData] = useState<RemindersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/reminders");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch reminders");
      }
      const json = (await res.json()) as RemindersData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load reminders", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleAction = async (action: "approve" | "skip", reminderIds: number[]) => {
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reminderIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Action failed");
      }
      const result = await res.json();
      toast.success(result.message || `Reminder(s) ${action}d`);
      fetchReminders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Action failed", { description: message });
    }
  };

  const handleSingleAction = async (action: "approve" | "skip", reminderId: number) => {
    try {
      setActionLoading(reminderId);
      await handleAction(action, [reminderId]);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (!data?.reminders.length) return;
    try {
      setApproveAllLoading(true);
      const allIds = data.reminders.map((r) => r.id);
      await handleAction("approve", allIds);
    } finally {
      setApproveAllLoading(false);
    }
  };

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminder Approval"
        description="Review and approve or skip pending automated reminders before they are sent."
        actions={
          data && data.reminders.length > 0 ? (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApproveAll}
              disabled={approveAllLoading}
            >
              <CheckCircle2 className="size-4" />
              Approve All
            </Button>
          ) : undefined
        }
      />

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
                <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="size-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.awaitingApproval ?? 0}</div>
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
                <div className="text-2xl font-bold">{stats?.approvedToday ?? 0}</div>
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
                <div className="text-2xl font-bold">{stats?.skippedToday ?? 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Reminders Queue ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ReminderCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.reminders.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No pending reminders</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                All reminders have been processed. Check back later for new ones.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.reminders.map((reminder) => {
            const targetName =
              [reminder.targetUser.firstName, reminder.targetUser.lastName]
                .filter(Boolean)
                .join(" ") || reminder.targetUser.email;
            const isBusy = actionLoading === reminder.id;

            return (
              <Card key={reminder.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header: Rule name + action type badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{reminder.rule.ruleName}</p>
                      {getActionTypeBadge(reminder.rule.actionType)}
                    </div>

                    {/* Message preview */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {reminder.messagePreview}
                    </p>

                    {/* Target user */}
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[10px] font-semibold shrink-0">
                        {reminder.targetUser.firstName?.[0]?.toUpperCase() ?? "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{targetName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {reminder.targetUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Created time */}
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(reminder.createdAt)}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isBusy || approveAllLoading}
                        onClick={() => handleSingleAction("approve", reminder.id)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy || approveAllLoading}
                        onClick={() => handleSingleAction("skip", reminder.id)}
                      >
                        <SkipForward className="size-3.5" />
                        Skip
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
