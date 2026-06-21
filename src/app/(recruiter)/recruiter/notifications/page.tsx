"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Phone,
  Calendar,
  User,
  Clock,
  AlarmClock,
  CheckCircle2,
  RefreshCw,
  Bell,
  Loader2,
  Inbox,
  Share2,
  Ban,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────

interface NotificationItem {
  id: number;
  title: string | null;
  message: string;
  type: string;
  is_read: boolean;
  related_entity_id: number | null;
  related_entity_type: string | null;
  metadata: string | null;
  snoozed_until: string | null;
  created_at: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

type FilterTab = "all" | "calls" | "leads" | "shift_requests" | "reminders";

// ─── Helpers ────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "call_scheduled":
    case "call_reminder":
    case "call_follow_up":
      return <Phone className="size-4" />;
    case "shift_accepted":
    case "shift_declined":
      return <Calendar className="size-4" />;
    case "lead_stage_change":
      return <User className="size-4" />;
    case "share_request":
      return <Share2 className="size-4" />;
    default:
      return <Bell className="size-4" />;
  }
}

function getNotificationIconBg(type: string): React.CSSProperties {
  // Spatial UI: gradient backgrounds with inset white highlight + colored shadow
  switch (type) {
    case "call_scheduled":
    case "call_reminder":
    case "call_follow_up":
      // Primary green
      return {
        background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
        color: "#fff",
      };
    case "shift_accepted":
      // Terra
      return {
        background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(201,123,84,0.28)",
        color: "#fff",
      };
    case "shift_declined":
      // Red
      return {
        background: "linear-gradient(180deg, #FCA5A5 0%, #DC2626 60%, #7F1D1D 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px rgba(220,38,38,0.28)",
        color: "#fff",
      };
    case "lead_stage_change":
      // Amber
      return {
        background: "linear-gradient(180deg, #FCD34D 0%, #D97706 60%, #92400E 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px rgba(217,119,6,0.28)",
        color: "#fff",
      };
    case "share_request":
      // Blue
      return {
        background: "linear-gradient(180deg, #60A5FA 0%, #3B82F6 60%, #1E40AF 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px rgba(59,130,246,0.28)",
        color: "#fff",
      };
    default:
      // Muted neutral — text-secondary gradient
      return {
        background: "linear-gradient(180deg, #9AAA94 0%, #6A8A6A 60%, #4A5A4A 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(106,138,106,0.28)",
        color: "#fff",
      };
  }
}

function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case "call_scheduled": return "Call Scheduled";
    case "call_reminder": return "Call Reminder";
    case "call_follow_up": return "Follow Up";
    case "shift_accepted": return "Shift Accepted";
    case "shift_declined": return "Shift Declined";
    case "lead_stage_change": return "Lead Update";
    case "share_request": return "Share Request";
    default: return type;
  }
}

function isCallRelated(type: string): boolean {
  return ["call_scheduled", "call_reminder", "call_follow_up"].includes(type);
}

function isLeadRelated(type: string): boolean {
  return ["lead_stage_change", "share_request"].includes(type);
}

// ─── Skeleton Loaders ───────────────────────────────────────────────

function NotificationCardSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="size-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notification Card Component ────────────────────────────────────

function NotificationCard({
  notification,
  onAction,
  actionLoading,
}: {
  notification: NotificationItem;
  onAction: (id: number, action: string) => void;
  actionLoading: number | null;
}) {
  const isLoading = actionLoading === notification.id;

  return (
    <Card
      className={`mb-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        notification.is_read ? "opacity-70" : ""
      }`}
      style={
        !notification.is_read
          ? { borderLeftWidth: "3px", borderLeftColor: "var(--primary)" }
          : {}
      }
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Icon — spatial gradient container */}
          <div
            className="size-10 rounded-[12px] flex items-center justify-center shrink-0"
            style={getNotificationIconBg(notification.type)}
          >
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {notification.title || notification.message}
                  </h3>
                  {!notification.is_read && (
                    <span className="size-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                {notification.title && (
                  <p className="text-sm text-text-secondary line-clamp-2 mb-1">
                    {notification.message}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="size-3" />
                  <span>{formatRelativeTime(notification.created_at)}</span>
                  <span>·</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-normal"
                  >
                    {getNotificationTypeLabel(notification.type)}
                  </Badge>
                  {notification.snoozed_until && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5" style={{ color: "var(--status-amber)" }}>
                        <AlarmClock className="size-3" />
                        Snoozed until {new Date(notification.snoozed_until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {isCallRelated(notification.type) && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onAction(notification.id, "called")}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Phone className="size-3" />
                    )}
                    Called
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onAction(notification.id, "reschedule")}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    Reschedule
                  </Button>
                </>
              )}

              {isLeadRelated(notification.type) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => onAction(notification.id, "not_interested")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Ban className="size-3" />
                  )}
                  Not Interested
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onAction(notification.id, "snooze")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <AlarmClock className="size-3" />
                )}
                Snooze
              </Button>

              {!notification.is_read && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => onAction(notification.id, "mark_read")}
                  disabled={isLoading}
                >
                  <CheckCircle2 className="size-3" />
                  Mark as Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { title: string; description: string }> = {
    all: {
      title: "No notifications",
      description: "You're all caught up! New notifications will appear here.",
    },
    calls: {
      title: "No call notifications",
      description: "Call schedules and reminders will appear here.",
    },
    leads: {
      title: "No lead notifications",
      description: "Lead updates and share requests will appear here.",
    },
    shift_requests: {
      title: "No shift request notifications",
      description: "Shift request responses will appear here.",
    },
    reminders: {
      title: "No reminders",
      description: "Call reminders and follow-ups will appear here.",
    },
  };

  const { title, description } = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-16 rounded-full bg-primary-light flex items-center justify-center mb-4">
        <Inbox className="size-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1 text-foreground">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm">{description}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function RecruiterNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/recruiter/notifications?type=${activeTab}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch notifications");
      }
      const data = (await res.json()) as NotificationsResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load notifications", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleAction = async (notificationId: number, action: string) => {
    setActionLoading(notificationId);
    try {
      if (action === "mark_read") {
        const res = await fetch("/api/recruiter/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to mark as read");
        }
        toast.success("Marked as read");
      } else {
        const res = await fetch(`/api/recruiter/notifications/${notificationId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to process action");
        }
        const data = await res.json();

        switch (action) {
          case "called":
            toast.success("Call logged successfully");
            break;
          case "reschedule":
            toast.success("Call rescheduled");
            break;
          case "snooze":
            toast.success("Notification snoozed for 1 hour", {
              description: data.snoozedUntil
                ? `Will reappear at ${new Date(data.snoozedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : undefined,
            });
            break;
          case "not_interested":
            toast.success("Lead marked as not interested");
            break;
        }
      }

      // Refresh notifications
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Action failed", { description: message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/recruiter/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to mark all as read");
      }
      const data = await res.json();
      toast.success(`${data.count || "All"} notifications marked as read`);
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to mark all as read", { description: message });
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications;
  }, [notifications]);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <PageHeader
        title="Notifications"
        description="Stay updated on calls, leads, and shift requests."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-primary text-white border-primary-hover hover:bg-primary-hover text-sm px-2.5">
                {unreadCount} unread
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || isLoading}
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary-light"
            >
              <CheckCircle2 className="size-3.5" />
              Mark All as Read
            </Button>
          </div>
        }
      />

      {/* ── Filter Tabs ───────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
      >
        <TabsList className="bg-white border border-border p-1 h-auto">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="calls"
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm"
          >
            <Phone className="size-3.5 mr-1 hidden sm:inline" />
            Calls
          </TabsTrigger>
          <TabsTrigger
            value="leads"
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm"
          >
            <User className="size-3.5 mr-1 hidden sm:inline" />
            Leads
          </TabsTrigger>
          <TabsTrigger
            value="shift_requests"
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm"
          >
            <Calendar className="size-3.5 mr-1 hidden sm:inline" />
            Shifts
          </TabsTrigger>
          <TabsTrigger
            value="reminders"
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm"
          >
            <AlarmClock className="size-3.5 mr-1 hidden sm:inline" />
            Reminders
          </TabsTrigger>
        </TabsList>

        {/* The content is the same for all tabs — we filter via the API */}
        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <NotificationCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState filter={activeTab} />
          ) : (
            <div className="max-h-[calc(100vh-20rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
